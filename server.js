const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/test")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const barcodeSchema = new mongoose.Schema({
    barcode: Number
});

const Barcode = mongoose.model("Barcode", barcodeSchema);

app.post("/save-barcode", async (req, res) => {
    try {
        const { barcode } = req.body;

        const newData = new Barcode({  
            barcode: barcode
        });

        await newData.save();

        console.log("Saved:", newData); 

        res.json({ message: "Barcode saved successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
