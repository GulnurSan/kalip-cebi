# Kalıp Cebi

A1'den C2'ye İngilizce kelime ve kalıp çalışma uygulaması. 668 kelime (Türkçe anlam ve örnek cümleyle) ve 205 kalıp içeriyor.

- Seviye seviye üniteler: her ünitede 10 kelime ve 3 kalıp
- Kartlar: İng → Tr, Tr → İng ya da karışık
- Aralıklı tekrar: kartlar 1, 3, 7, 14, 30, 60 gün sonra tekrar gelir
- Quiz: ünite ve seviye quizleri
- Sesli okuma (İngiliz / Amerikan aksanı)
- Sözlük ve arama
- İnternetsiz çalışır, ilerleme telefonda saklanır

## Kelime eklemek

`data/` klasöründeki dosyalarda her kelime `["english","türkçe","Example sentence."]`, her kalıp `["English phrase","Türkçe karşılığı"]` biçiminde yazılıdır. Yeni satır ekleyip kaydetmen yeterli.

Bir dosyayı değiştirdikten sonra `sw.js` içindeki `kalipcebi-v1` adını `kalipcebi-v2` yap. Böylece telefon yeni sürümü indirir.
