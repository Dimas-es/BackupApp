📦 BackupApp

BackupApp adalah aplikasi desktop berbasis Electron dan Node.js untuk melakukan backup otomatis ke Google Drive, serta mencatat log backup ke Google Sheets. Penjadwalan dilakukan menggunakan node-schedule.
🚀 Fitur Utama

👨‍👩‍👧‍👦 Anggota Tim & Kontribusi

| Nama                         | Kontribusi                                                                                  |
| -----------------------------| --------------------------------------------------------------------------------------------|
| Dimas Setiawan               | Membuat fitur backup ke lokal dan tampilan antarmuka BackupApp                              |
| Sekar Ayu Fatmawati          | Menghubungkan Service Account ke dalam kode untuk integrasi Sheets API                      |
| Shelva Nur Fatimah           | Membuat Service Account untuk Google Sheets                                                 |
| Talitha Ramadhani Nur Azizah | Menghubungkan OAuth Client ID untuk akses Google Drive                                      |
| Yusa Putra Rosdiana          | Membuat OAuth Client ID untuk google drive dan merapikan backend (struktur dan logika kode) |


  🔁 Backup otomatis file atau folder sesuai jadwal

  ☁️ Upload hasil backup ke Google Drive

  📊 Catatan backup tersimpan ke Log & Google Sheets

  🖥️ Antarmuka desktop menggunakan Electron

  ⏰ Penjadwalan fleksibel menggunakan node-schedule

🧰 Teknologi yang Digunakan

1. Node.js

2. Electron

3. node-schedule

4. Google Drive API

5. Google Sheets API

6. googleapis (NPM)

⚙️ Instalasi

Clone repositori

    git clone https://github.com/Dimas-es/BackupApp.git
    cd BackupApp

(Disarankan) Atur konfigurasi NPM agar mengabaikan konflik dependensi

    npm config set legacy-peer-deps true

Install semua dependensi

    npm install

Siapkan Google API

1. Masuk ke Google Cloud Console

2. Aktifkan Google Drive API dan Google Sheets API

3. Buat OAuth Client ID atau Service Account

4. Unduh file credentials.json dan simpan di folder auth/

Jalankan aplikasi

    npm start


