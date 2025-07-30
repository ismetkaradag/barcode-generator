'use client'

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

export default function Home() {
  // Ana state'ler
  const [barcodeType, setBarcodeType] = useState('EAN13') // CODE128, EAN13, QR
  const [inputMode, setInputMode] = useState('manual') // manual, excel
  const [hasHeaders, setHasHeaders] = useState(true)
  
  // Manuel giriş
  const [manualBarcodeText, setManualBarcodeText] = useState('')
  const [manualDisplayLines, setManualDisplayLines] = useState([''])
  
  // Excel verisi
  const [excelData, setExcelData] = useState([])
  const [excelHeaders, setExcelHeaders] = useState([])
  const [barcodeContentTemplate, setBarcodeContentTemplate] = useState('')
  const [selectedDisplayColumns, setSelectedDisplayColumns] = useState([])
  
  // Barkod ayarları
  const [barcodeWidth, setBarcodeWidth] = useState(3) // cm
  const [barcodeHeight, setBarcodeHeight] = useState(1.5) // cm
  const [fontSize, setFontSize] = useState(12)
  const [barcodesPerPage, setBarcodesPerPage] = useState(6) // Sayfa başına barkod sayısı
  
  // Önizleme ve çıktı
  const [barcodes, setBarcodes] = useState([])
  const [isPrinting, setIsPrinting] = useState(false)
  const barcodeRefs = useRef({})

  // Excel dosyası yükleme
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Başlık satırı varsa veya yoksa tüm veriyi al
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, // Her zaman ilk satırı başlık olarak al
          defval: ''
        });

        if (jsonData.length > 0) {
          let actualData, headers;
          
          if (hasHeaders && jsonData.length > 1) {
            // İlk satır başlık, geri kalanlar veri
            headers = Object.values(jsonData[0]);
            actualData = jsonData.slice(1).map(row => {
              const newRow = {};
              headers.forEach((header, index) => {
                newRow[header] = Object.values(row)[index] || '';
              });
              return newRow;
            });
          } else {
            // İlk satır da veri
            headers = Object.keys(jsonData[0]).map((key, index) => 
              String.fromCharCode(65 + index)
            );
            actualData = jsonData.map(row => {
              const newRow = {};
              headers.forEach((header, index) => {
                newRow[header] = Object.values(row)[index] || '';
              });
              return newRow;
            });
          }
          
          setExcelData(actualData);
          setExcelHeaders(headers);
          setBarcodeContentTemplate('');
        }
      } catch (error) {
        alert('Excel dosyası okuma hatası: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Template yönetimi fonksiyonları
  const addColumnToTemplate = (columnName) => {
    const placeholder = `{${columnName}}`;
    setBarcodeContentTemplate(prev => prev + placeholder);
  };
  
  const removeFromTemplate = (placeholder) => {
    setBarcodeContentTemplate(prev => prev.replace(placeholder, ''));
  };
  
  const parseTemplate = (template) => {
    const parts = [];
    let currentText = '';
    let i = 0;
    
    while (i < template.length) {
      if (template[i] === '{') {
        // Önceki text varsa ekle
        if (currentText) {
          parts.push({ type: 'text', content: currentText });
          currentText = '';
        }
        
        // Placeholder'ı bul
        const start = i;
        let end = template.indexOf('}', i);
        if (end !== -1) {
          const placeholder = template.substring(start, end + 1);
          const columnName = template.substring(start + 1, end);
          parts.push({ type: 'variable', content: columnName, placeholder });
          i = end + 1;
        } else {
          currentText += template[i];
          i++;
        }
      } else {
        currentText += template[i];
        i++;
      }
    }
    
    // Son text varsa ekle
    if (currentText) {
      parts.push({ type: 'text', content: currentText });
    }
    
    return parts;
  };

  // Manuel satır ekleme/çıkarma
  const addManualLine = () => {
    setManualDisplayLines([...manualDisplayLines, '']);
  };

  const removeManualLine = (index) => {
    if (manualDisplayLines.length > 1) {
      setManualDisplayLines(manualDisplayLines.filter((_, i) => i !== index));
    }
  };

  const updateManualLine = (index, value) => {
    const newLines = [...manualDisplayLines];
    newLines[index] = value;
    setManualDisplayLines(newLines);
  };

  // Barkod oluşturma
  const generateBarcodes = () => {
    let generatedBarcodes = [];

    if (inputMode === 'manual') {
      if (manualBarcodeText.trim()) {
        generatedBarcodes.push({
          id: 'manual-1',
          barcodeText: manualBarcodeText,
          displayLines: manualDisplayLines.filter(line => line.trim())
        });
      }
    } else if (inputMode === 'excel' && excelData.length > 0 && barcodeContentTemplate) {
      generatedBarcodes = excelData.map((row, index) => {
        // Barkod içeriğini template'e göre oluştur
        let barcodeText = barcodeContentTemplate;
        excelHeaders.forEach(header => {
          const placeholder = `{${header}}`;
          if (barcodeText.includes(placeholder)) {
            barcodeText = barcodeText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(row[header] || ''));
          }
        });
        
        // Seperatör varsa ve birden fazla sütun kullanılıyorsa
        if (barcodeText.includes('{') && barcodeText.includes('}')) {
          // Template'de kalan placeholder'ları temizle
          barcodeText = barcodeText.replace(/\{[^}]*\}/g, '');
        }
        
        const displayLines = selectedDisplayColumns
          .map(col => String(row[col] || ''))
          .filter(line => line.trim());
        
        return {
          id: `excel-${index}`,
          barcodeText: barcodeText.trim(),
          displayLines
        };
      }).filter(item => item.barcodeText.trim());
    }

    setBarcodes(generatedBarcodes);
  };

  // Barkod render etme
  useEffect(() => {
    barcodes.forEach(barcode => {
      const canvas = barcodeRefs.current[barcode.id];
      if (!canvas) return;

      // cm'den px'e dönüşüm (1 cm = 37.795275591 px @ 96 DPI)
      const actualWidth = Math.round(barcodeWidth * 37.795275591);
      const actualHeight = Math.round(barcodeHeight * 37.795275591) + 60; // extra space for text
      
      // Canvas boyutlarını doğrudan ayarla
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      
      // CSS boyutlarını da aynı yap (scaling yok)
      canvas.style.width = actualWidth + 'px';
      canvas.style.height = actualHeight + 'px';
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, actualWidth, actualHeight);

      try {
        if (barcodeType === 'QR') {
          // Gerçek QR kod oluştur
          QRCode.toCanvas(canvas, barcode.barcodeText, {
            width: Math.min(actualWidth - 20, actualHeight - 80),
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, (error) => {
            if (error) {
              console.error('QR kod hatası:', error);
              return;
            }
            
            // QR kod oluşturduktan sonra alt yazıları ekle
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.font = `${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            let yOffset = actualHeight - 50;
            const lineHeight = fontSize + 3;
            
            barcode.displayLines.forEach((line, index) => {
              const y = yOffset + (index * lineHeight);
              ctx.fillText(line, actualWidth / 2, y);
            });
          });
        } else {
          // Gerçek 1D barkod oluştur (CODE128, EAN13)
          const barcodeHeightPx = actualHeight - 70;
          
          // Geçici canvas oluştur barkod için
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = actualWidth;
          tempCanvas.height = barcodeHeightPx;
          
          try {
            let barcodeValue = barcode.barcodeText;
            
            // EAN13 için özel hazırlık
            if (barcodeType === 'EAN13') {
              // Sadece sayıları al
              barcodeValue = barcodeValue.replace(/\D/g, '');
              
              if (barcodeValue.length === 0) {
                throw new Error('EAN13 için sayısal veri gerekli');
              }
              
              // EAN13 için 12 haneye tamamla (check digit otomatik eklenir)
              if (barcodeValue.length < 12) {
                barcodeValue = barcodeValue.padStart(12, '0');
              } else if (barcodeValue.length > 13) {
                barcodeValue = barcodeValue.substring(0, 12);
              }
            }
            
            JsBarcode(tempCanvas, barcodeValue, {
              format: barcodeType,
              width: Math.max(1, actualWidth / 100),
              height: barcodeHeightPx - 20,
              displayValue: false, // Alt yazıyı kendimiz ekleyeceğiz
              margin: 10,
              background: '#FFFFFF',
              lineColor: '#000000'
            });
            
            // Ana canvas'a barkodu çiz
            ctx.drawImage(tempCanvas, 0, 10);
            
          } catch (barcodeError) {
            console.error('Barkod oluşturma hatası:', barcodeError);
            // Hata durumunda placeholder çiz
            ctx.fillStyle = '#FF0000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BARKOD HATASI', actualWidth / 2, actualHeight / 2 - 20);
            ctx.fillText(`Format: ${barcodeType}`, actualWidth / 2, actualHeight / 2);
            ctx.fillText(`Değer: ${barcode.barcodeText}`, actualWidth / 2, actualHeight / 2 + 20);
            
            // EAN13 için özel hata mesajı
            if (barcodeType === 'EAN13') {
              ctx.font = '10px Arial';
              ctx.fillText('EAN13: Sadece 12-13 haneli sayılar', actualWidth / 2, actualHeight / 2 + 40);
            }
          }
          
          // Alt yazıları ekle
          ctx.fillStyle = '#000000';
          ctx.font = `${fontSize}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          let yOffset = actualHeight - 55;
          const lineHeight = fontSize + 3;
          
          barcode.displayLines.forEach((line, index) => {
            const y = yOffset + (index * lineHeight);
            ctx.fillText(line, actualWidth / 2, y);
          });
        }

      } catch (error) {
        console.error('Genel barkod oluşturma hatası:', error);
        // Genel hata durumunda placeholder çiz
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FF0000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BARKOD OLUŞTURULAMADI', actualWidth / 2, actualHeight / 2);
        ctx.fillText(`${barcode.barcodeText}`, actualWidth / 2, actualHeight / 2 + 20);
      }
    });
  }, [barcodes, barcodeType, fontSize, barcodeWidth, barcodeHeight, barcodesPerPage]);

  // Print layout hesaplama
  const calculatePrintLayout = () => {
    const columns = barcodesPerPage === 1 ? 1 : 
                   barcodesPerPage <= 3 ? 1 :
                   barcodesPerPage <= 4 ? 2 : 
                   barcodesPerPage <= 6 ? 2 : 3;
    
    let gridClass;
    if (barcodesPerPage === 1) {
      gridClass = 'block';
    } else if (columns === 1) {
      gridClass = 'grid grid-cols-1 gap-4';
    } else if (columns === 2) {
      gridClass = 'grid grid-cols-2 gap-4';
    } else {
      gridClass = 'grid grid-cols-3 gap-4';
    }
    
    return {
      columns,
      gridClass
    };
  };
  
  // Barkodları sayfalara böl
  const chunkBarcodes = (barcodes, size) => {
    const chunks = [];
    for (let i = 0; i < barcodes.length; i += size) {
      chunks.push(barcodes.slice(i, i + size));
    }
    return chunks;
  };

  // Yazdırma
  const handlePrint = async () => {
    setIsPrinting(true);
    // Print canvas'larının render edilmesini bekle
    await new Promise(resolve => setTimeout(resolve, 1500));
    window.print();
    setIsPrinting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center no-print">
          Barkod Oluşturucu
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Panel - Ayarlar */}
          <div className="lg:col-span-1 space-y-6 no-print">
            {/* Barkod Tipi */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Barkod Tipi</h2>
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="radio"
                    value="CODE128"
                    checked={barcodeType === 'CODE128'}
                    onChange={(e) => setBarcodeType(e.target.value)}
                    className="mr-2 mt-1"
                  />
                  <div>
                    <div className="font-medium">Code 128 (Çizgi Barkod)</div>
                    <div className="text-xs text-gray-600">Harf, rakam, özel karakter destekler</div>
                  </div>
                </label>
                <label className="flex items-start">
                  <input
                    type="radio"
                    value="EAN13"
                    checked={barcodeType === 'EAN13'}
                    onChange={(e) => setBarcodeType(e.target.value)}
                    className="mr-2 mt-1"
                  />
                  <div>
                    <div className="font-medium">EAN-13 (Çizgi Barkod)</div>
                    <div className="text-xs text-gray-600">Sadece 12-13 haneli rakamlar (otomatik doldurulur)</div>
                  </div>
                </label>
                <label className="flex items-start">
                  <input
                    type="radio"
                    value="QR"
                    checked={barcodeType === 'QR'}
                    onChange={(e) => setBarcodeType(e.target.value)}
                    className="mr-2 mt-1"
                  />
                  <div>
                    <div className="font-medium">QR Kod (Kare Kod)</div>
                    <div className="text-xs text-gray-600">Tüm karakterler, yüksek kapasiteli</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Veri Giriş Modu */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Veri Giriş Modu</h2>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="manual"
                    checked={inputMode === 'manual'}
                    onChange={(e) => setInputMode(e.target.value)}
                    className="mr-2"
                  />
                  Tek Tek Oluşturma
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="excel"
                    checked={inputMode === 'excel'}
                    onChange={(e) => setInputMode(e.target.value)}
                    className="mr-2"
                  />
                  Excel'den Yükleme
                </label>
              </div>
            </div>

            {/* Barkod Ayarları */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Barkod Ayarları</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Genişlik (cm)
                  </label>
                  <input
                    type="number"
                    value={barcodeWidth}
                    onChange={(e) => setBarcodeWidth(Number(e.target.value))}
                    min="1"
                    max="10"
                    step="0.1"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Yükseklik (cm)
                  </label>
                  <input
                    type="number"
                    value={barcodeHeight}
                    onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                    min="0.5"
                    max="5"
                    step="0.1"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Font Boyutu (px)
                  </label>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    min="8"
                    max="24"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sayfa Başına Barkod Sayısı
                  </label>
                  <select
                    value={barcodesPerPage}
                    onChange={(e) => setBarcodesPerPage(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value={1}>1 (Her barkod ayrı sayfa)</option>
                    <option value={2}>2 (2 barkod/sayfa)</option>
                    <option value={3}>3 (3 barkod/sayfa)</option>
                    <option value={4}>4 (2x2 düzen)</option>
                    <option value={6}>6 (2x3 düzen)</option>
                    <option value={9}>9 (3x3 düzen)</option>
                    <option value={12}>12 (3x4 düzen)</option>
                  </select>
                  <div className="text-xs text-gray-600 mt-1">
                    {barcodesPerPage === 1 ? 'Her barkod sol üste, ayrı sayfa' : `${Math.ceil(Math.sqrt(barcodesPerPage))} sütun düzeninde`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Orta Panel - Veri Girişi */}
          <div className="lg:col-span-1 space-y-6 no-print">
            {inputMode === 'manual' ? (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Manuel Veri Girişi</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Barkod İçeriği
                    </label>
                    <input
                      type="text"
                      value={manualBarcodeText}
                      onChange={(e) => setManualBarcodeText(e.target.value)}
                      placeholder="Barkod içeriğini girin"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Barkod Altı Yazılar
                    </label>
                    {manualDisplayLines.map((line, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={line}
                          onChange={(e) => updateManualLine(index, e.target.value)}
                          placeholder={`Satır ${index + 1}`}
                          className="flex-1 border border-gray-300 rounded px-3 py-2"
                        />
                        {manualDisplayLines.length > 1 && (
                          <button
                            onClick={() => removeManualLine(index)}
                            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            -
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addManualLine}
                      className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      + Satır Ekle
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Excel Dosyası Yükleme</h2>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={hasHeaders}
                        onChange={(e) => setHasHeaders(e.target.checked)}
                        className="mr-2"
                      />
                      İlk satır sütun adı
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Excel Dosyası Seç
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>

                  {excelHeaders.length > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Barkod İçeriği Template
                        </label>
                        
                        {/* Template Editor */}
                        <div className="border border-gray-300 rounded p-3 mb-3 min-h-[60px] bg-white flex flex-wrap gap-1 items-center">
                          {parseTemplate(barcodeContentTemplate).map((part, index) => {
                            if (part.type === 'variable') {
                              return (
                                <span
                                  key={index}
                                  className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm border border-blue-200"
                                >
                                  {part.content}
                                  <button
                                    onClick={() => removeFromTemplate(part.placeholder)}
                                    className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            } else {
                              return (
                                <span key={index} className="text-gray-700">
                                  {part.content}
                                </span>
                              );
                            }
                          })}
                          
                          {/* Metin giriş input'u */}
                          <input
                            type="text"
                            className="border-none outline-none flex-1 min-w-[100px] bg-transparent"
                            placeholder={barcodeContentTemplate ? "Seperatör ekle..." : "Buraya seperatör yazabilir veya aşağıdaki butonlara basabilirsiniz"}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.target.value;
                                if (value) {
                                  setBarcodeContentTemplate(prev => prev + value);
                                  e.target.value = '';
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value) {
                                setBarcodeContentTemplate(prev => prev + value);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                        
                        {/* Sütun Butonları */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-2">
                            Kullanılabilir sütunlar (tıklayarak ekleyin):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {excelHeaders.map(header => (
                              <button
                                key={header}
                                onClick={() => addColumnToTemplate(header)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded border transition-colors"
                              >
                                {header}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Temizle butonu */}
                        {barcodeContentTemplate && (
                          <button
                            onClick={() => setBarcodeContentTemplate('')}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Template'ı Temizle
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Barkod Altı Yazı Sütunları
                        </label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {excelHeaders.map(header => (
                            <label key={header} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedDisplayColumns.includes(header)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDisplayColumns([...selectedDisplayColumns, header]);
                                  } else {
                                    setSelectedDisplayColumns(selectedDisplayColumns.filter(col => col !== header));
                                  }
                                }}
                                className="mr-2"
                              />
                              {header}
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {excelData.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Toplam {excelData.length} kayıt yüklendi
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={generateBarcodes}
                className="w-full py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Barkodları Oluştur
              </button>
            </div>
          </div>

          {/* Sağ Panel - Önizleme */}
          <div className="lg:col-span-1 no-print">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Önizleme</h2>
                {barcodes.length > 0 && (
                  <button
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className={`px-4 py-2 text-white rounded transition-colors ${
                      isPrinting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {isPrinting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Hazırlanıyor...
                      </div>
                    ) : (
                      'Yazdır'
                    )}
                  </button>
                )}
              </div>
              
              {barcodes.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Henüz barkod oluşturulmadı
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <div className="font-semibold">Yazdırma Bilgileri:</div>
                      <div>Toplam barkod: <span className="font-mono">{barcodes.length}</span></div>
                      <div>Sayfa başına: <span className="font-mono">{barcodesPerPage}</span> barkod</div>
                      <div>Toplam sayfa: <span className="font-mono">{Math.ceil(barcodes.length / barcodesPerPage)}</span></div>
                      <div className="text-xs mt-1 text-blue-600">
                        {barcodesPerPage === 1 ? 'Her barkod ayrı sayfada sol üste yerleştirilecek' : 
                         `${calculatePrintLayout().columns} sütunlu düzende yerleştirilecek`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {barcodes.slice(0, 5).map(barcode => (
                      <div key={barcode.id} className="border border-gray-200 p-2 rounded">
                        <canvas
                          ref={el => barcodeRefs.current[barcode.id] = el}
                          className="border max-w-full"
                          style={{
                            display: 'block',
                            margin: '0 auto'
                          }}
                        />
                      </div>
                    ))}
                    {barcodes.length > 5 && (
                      <div className="text-sm text-gray-600 text-center">
                        ... ve {barcodes.length - 5} tane daha
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Debug: İlk 3 Barkod İçeriği */}
            {barcodes.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg shadow-md mt-4">
                <h3 className="text-lg font-semibold mb-3 text-yellow-800">İlk 3 Barkod İçeriği (Debug)</h3>
                <div className="space-y-2">
                  {barcodes.slice(0, 3).map((barcode, index) => {
                    // EAN13 için işlenmiş değeri hesapla
                    let processedValue = barcode.barcodeText;
                    if (barcodeType === 'EAN13') {
                      processedValue = barcode.barcodeText.replace(/\D/g, '');
                      if (processedValue.length < 12) {
                        processedValue = processedValue.padStart(12, '0');
                      } else if (processedValue.length > 13) {
                        processedValue = processedValue.substring(0, 12);
                      }
                    }
                    
                    return (
                      <div key={barcode.id} className="bg-white p-2 rounded border">
                        <div className="text-sm font-medium text-gray-700">Barkod {index + 1}:</div>
                        <div className="text-lg font-mono bg-gray-100 p-1 rounded mt-1">
                          "{barcode.barcodeText}"
                        </div>
                        {barcodeType === 'EAN13' && processedValue !== barcode.barcodeText && (
                          <div className="text-sm font-mono bg-blue-100 p-1 rounded mt-1">
                            EAN13 işlenmiş: "{processedValue}"
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Orijinal: {barcode.barcodeText.length} karakter
                          {barcodeType === 'EAN13' && (
                            <span>, İşlenmiş: {processedValue.length} karakter</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {barcodeType === 'EAN13' && (
                  <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
                    <strong>EAN13 Bilgi:</strong> 5-6 karakterlik ID'ler sıfırla doldurularak 12 haneye tamamlanır. Seperatör template içinde yazılabilir.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Print Preview - Sadece yazdırma sırasında görünür */}
        <div className="print-only hidden">
          {chunkBarcodes(barcodes, barcodesPerPage).map((pageBarcode, pageIndex) => {
            const { columns, gridClass } = calculatePrintLayout();
            
            return (
              <div 
                key={`page-${pageIndex}`} 
                className={`${pageIndex > 0 ? 'page-break-before' : ''} p-4 min-h-screen flex ${barcodesPerPage === 1 ? 'justify-start items-start' : 'justify-center items-center'}`}
              >
                <div className={gridClass}>
                  {pageBarcode.map((barcode, index) => {
                    console.log(`Print render: Page ${pageIndex + 1}, Barcode ${index + 1}/${pageBarcode.length} - ${barcode.barcodeText}`);
                    const actualWidth = Math.round(barcodeWidth * 37.795275591);
                    const actualHeight = Math.round(barcodeHeight * 37.795275591) + 60;
                    
                    return (
                      <div key={`print-${barcode.id}`} className={`barcode-item ${barcodesPerPage === 1 ? 'w-fit' : 'flex justify-center'}`}>
                        <canvas
                          width={actualWidth}
                          height={actualHeight}
                          style={{
                            width: actualWidth + 'px',
                            height: actualHeight + 'px',
                            display: 'block'
                          }}
                          ref={el => {
                            if (el) {
                              // Her print canvas'ı için ayrı render
                              const ctx = el.getContext('2d');
                              ctx.clearRect(0, 0, actualWidth, actualHeight);
                              
                              try {
                                if (barcodeType === 'QR') {
                                  // QR kod için direkt render
                                  QRCode.toCanvas(el, barcode.barcodeText, {
                                    width: Math.min(actualWidth - 20, actualHeight - 80),
                                    margin: 2,
                                    color: {
                                      dark: '#000000',
                                      light: '#FFFFFF'
                                    }
                                  }, (error) => {
                                    if (!error) {
                                      // QR kod oluşturduktan sonra alt yazıları ekle
                                      ctx.fillStyle = '#000000';
                                      ctx.font = `${fontSize}px Arial, sans-serif`;
                                      ctx.textAlign = 'center';
                                      ctx.textBaseline = 'top';
                                      
                                      let yOffset = actualHeight - 50;
                                      const lineHeight = fontSize + 3;
                                      
                                      barcode.displayLines.forEach((line, lineIndex) => {
                                        const y = yOffset + (lineIndex * lineHeight);
                                        ctx.fillText(line, actualWidth / 2, y);
                                      });
                                    }
                                  });
                                } else {
                                  // 1D Barkod için direkt render
                                  const barcodeHeightPx = actualHeight - 70;
                                  const tempCanvas = document.createElement('canvas');
                                  tempCanvas.width = actualWidth;
                                  tempCanvas.height = barcodeHeightPx;
                                  
                                  let barcodeValue = barcode.barcodeText;
                                  if (barcodeType === 'EAN13') {
                                    barcodeValue = barcodeValue.replace(/\D/g, '');
                                    if (barcodeValue.length < 12) {
                                      barcodeValue = barcodeValue.padStart(12, '0');
                                    } else if (barcodeValue.length > 13) {
                                      barcodeValue = barcodeValue.substring(0, 12);
                                    }
                                  }
                                  
                                  try {
                                    JsBarcode(tempCanvas, barcodeValue, {
                                      format: barcodeType,
                                      width: Math.max(1, actualWidth / 100),
                                      height: barcodeHeightPx - 20,
                                      displayValue: false,
                                      margin: 10,
                                      background: '#FFFFFF',
                                      lineColor: '#000000'
                                    });
                                    
                                    ctx.drawImage(tempCanvas, 0, 10);
                                    
                                  } catch (barcodeError) {
                                    console.error('Print barkod hatası:', barcodeError);
                                  }
                                  
                                  // Alt yazıları ekle
                                  ctx.fillStyle = '#000000';
                                  ctx.font = `${fontSize}px Arial, sans-serif`;
                                  ctx.textAlign = 'center';
                                  ctx.textBaseline = 'top';
                                  
                                  let yOffset = actualHeight - 55;
                                  const lineHeight = fontSize + 3;
                                  
                                  barcode.displayLines.forEach((line, lineIndex) => {
                                    const y = yOffset + (lineIndex * lineHeight);
                                    ctx.fillText(line, actualWidth / 2, y);
                                  });
                                }
                              } catch (error) {
                                console.error('Print render hatası:', error);
                              }
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}