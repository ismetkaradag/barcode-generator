# Barkod Oluşturucu

Next.js ile geliştirilmiş kapsamlı barkod oluşturma ve yazdırma uygulaması.

## Özellikler

- ✅ **Çoklu Barkod Desteği**: Code 128, EAN-13 ve QR Kod
- ✅ **İki Veri Giriş Modu**: Manuel tek tek giriş veya Excel dosyası yükleme
- ✅ **Excel Entegrasyonu**: XLSX/XLS dosyalarından toplu barkod oluşturma
- ✅ **Özelleştirilebilir Ayarlar**: Barkod boyutları ve font ayarları
- ✅ **Sütun Seçimi**: Excel'den hangi sütunların kullanılacağını seçme
- ✅ **Canlı Önizleme**: Barkodları yazdırmadan önce görme
- ✅ **Print Optimizasyonu**: Yazdırma için özel düzenlenmiş çıktı
- ✅ **Responsive Tasarım**: Tailwind CSS ile modern arayüz

## Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Geliştirme sunucusunu başlatın:**
   ```bash
   npm run dev
   ```

3. **Tarayıcıda açın:**
   ```
   http://localhost:3000
   ```

## Kullanım

### Manuel Barkod Oluşturma
1. "Tek Tek Oluşturma" modunu seçin
2. Barkod içeriğini girin
3. Barkod altına yazılacak satırları ekleyin
4. "Barkodları Oluştur" butonuna tıklayın

### Excel ile Toplu Oluşturma
1. "Excel'den Yükleme" modunu seçin
2. Excel dosyanızı yükleyin
3. **Yeni Template Sistemi:**
   - Sütun butonlarına tıklayarak değişken ekleyin
   - Seperatörleri direkt metin kutusuna yazin (-, _, | vb.)
   - Her değişkenin yanındaki X ile silin
   - Örnek: `ModelKodu` + `-` + `StokKodu` = `{ModelKodu}-{StokKodu}`
4. Barkod altına yazdırılacak sütunları seçin
5. "Barkodları Oluştur" butonuna tıklayın

### Ayarlar
- **Barkod Tipi**: Code 128, EAN-13 veya QR Kod
- **Boyut**: Genişlik ve yükseklik (cm cinsinden)
- **Font**: Alt yazılar için font boyutu
- **Sayfa başına barkod**: 1-12 arası seçenek
- **Template Sistemi**: Birden fazla sütunu birleştirme
- **Başlık Yönetimi**: İlk satırın başlık/veri olma durumu

### Yazdırma
- Önizlemede "Yazdır" butonuna tıklayın
- **Sayfa bilgileri**: Toplam barkod, sayfa sayısı ve düzen gösterilir
- **Esnek sayfa düzeni**: 1-12 barkod/sayfa seçenekleri
- **Otomatik hazırlık**: Sistem tüm barkodları yazdırma için hazırlar (1-2 saniye bekler)
- **Loading animasyonu**: "Hazırlanıyor..." mesajı görünür
- Tarayıcı yazdırma penceresi açılır
- **Dinamik düzen**: Seçilen ayara göre otomatik yerleşim
- **Tüm barkodlar**: Sadece ilk 5 değil, tüm barkodlar yazdırılır
- Sayfa düzenini ve yazıcı ayarlarını yapın
- Yazdırın

**Sayfa Düzen Seçenekleri:**
- **1 barkod/sayfa**: Her barkod ayrı sayfa, sol üst köşe
- **2-3 barkod/sayfa**: 1 sütunlu dikey düzen
- **4 barkod/sayfa**: 2x2 grid düzen
- **6 barkod/sayfa**: 2x3 grid düzen
- **9 barkod/sayfa**: 3x3 grid düzen
- **12 barkod/sayfa**: 3x4 grid düzen

## Excel Dosyası Formatı

Excel dosyanız şu formatta olmalıdır:

| Ürün Kodu | Ürün Adı | Kategori | Fiyat |
|-----------|----------|----------|-------|
| 12345     | Ürün 1   | Elektronik | 50 TL |
| 67890     | Ürün 2   | Kitap    | 75 TL |

**Template Örnekleri:**
- Tek sütun: `{ModelKodu}` → ABC123
- İki sütun: `{ModelKodu}-{StokKodu}` → ABC123-DEF456
- Üçlü: `{Kategori}|{ModelKodu}|{Barkod}` → Elektronik|ABC123|1234567890123
- Karışık: `PR-{ModelKodu}_V{VaryasyonStokKodu}` → PR-ABC123_V001

**Yeni Tag Sistemi:**
- 🟦 **Mavi etiketler**: Değişkenler (sütun verileri)
- ⚙️ **X butonu**: Değişkeni sil
- ✏️ **Metin kutusu**: Seperatör ve sabit metin ekle
- 🔴 **Sütun butonları**: Tıklayarak hızla ekle

**Önemli Notlar:**
- İlk satır başlık olarak kullanılır ("İlk satır sütun adı" işaretliyse)
- Değişkenler otomatik `{}` içinde oluşturulur
- Seperatörler manuel olarak template içine yazılır
- Boş hücreler göz ardı edilir

## Teknolojiler

- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **SheetJS (XLSX)** - Excel dosyası okuma
- **Canvas API** - Barkod çizimi
- **Browser Print API** - Yazdırma

## Geliştirme

```bash
# Geliştirme modu
npm run dev

# Production build
npm run build

# Production sunucu
npm start

# Linting
npm run lint
```

## Not

Bu uygulama temel barkod simülasyonu yapmaktadır. Gerçek üretim ortamında JsBarcode ve qrcode kütüphaneleri tam entegre edilmelidir.

## Lisans

MIT License