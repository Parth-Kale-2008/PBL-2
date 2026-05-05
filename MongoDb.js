const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/test");

app.post("/login", (req, res) => {

    console.log("Username:", req.body.username);
    console.log("Password:", req.body.password);

    res.send("Received");
});

app.listen(8080, () => {
    console.log("Server Running");
});
