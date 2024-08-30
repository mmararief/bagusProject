const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const Parse = require('parse/node');
const path = require('path');
const fs = require('fs');

// Konfigurasi Parse
Parse.initialize("fullandstarvingnew4009452495311007");
Parse.serverURL = 'http://localhost:1337/parse';

// Set up Express
const app = express();
const port = 3000;

// Middleware untuk parsing JSON
app.use(express.json());

// Middleware untuk menangani file upload
const upload = multer({ dest: 'uploads/' });

// Serve static files (e.g., HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Rute untuk mengunggah file dan memproses Excel
app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Hapus file setelah selesai diproses
    fs.unlinkSync(filePath);

    // Kirim data yang telah diparsing kembali ke klien
    res.json({ message: 'File uploaded and parsed successfully.', data: worksheet });
  } catch (error) {
    console.error('Error processing file:', error.message);
    res.status(500).json({ message: 'Error processing file.' });
  }
});

// Rute untuk batch upload
app.post('/uploadBatch', async (req, res) => {
  const { dataBatch } = req.body;

  let dataOutput = '';

  try {
    for (const row of dataBatch) {
      const { email, name, cityClient, facebook } = row;

      if (email && name && cityClient && facebook) {
        try {
          const ContactList = Parse.Object.extend("ContactList");
          const contact = new ContactList();
          contact.set("email", email.toLowerCase());
          contact.set("name", name);
          contact.set("cityClient", cityClient.toLowerCase());
          contact.set("facebook", facebook);
          
          // Simpan data contact
          await contact.save();

          // Periksa dan update citiesList
          const CitiesList = Parse.Object.extend("CitiesList");
          const query = new Parse.Query(CitiesList);
          query.equalTo("city", cityClient.toLowerCase());
          
          const results = await query.find();
          if (results.length > 0) {
            const city = results[0];
            city.set("size", (city.get("size") || 0) + 1);
            await city.save();
          } else {
            const city = new CitiesList();
            city.set("city", cityClient.toLowerCase());
            city.set("size", 1);
            await city.save();
          }

          dataOutput += `Uploaded ${email} successfully.\n`;
        } catch (error) {
          dataOutput += `Error uploading ${email}: ${error.message}\n`;
        }
      }
    }

    res.json({ message: 'Batch upload completed.', data: dataOutput });
  } catch (error) {
    console.error('Error processing batch:', error.message);
    res.status(500).json({ message: 'Error processing batch.' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
