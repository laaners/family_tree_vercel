const axios = require("axios");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const uuid = require("uuid-v4");
const multer = require("multer");
const upload = multer();
require("dotenv").config();

const serviceAccount = JSON.parse(process.env.privateKey);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	storageBucket: "gs://family-tree-518ab.appspot.com",
});
const PORT = 4000;

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
	res.status(200).json("Welcome, your app is working well");
});

app.get("/family_member/:id", async (req, res) => {
	const id = req.params.id;
	const docRef = await admin
		.firestore()
		.collection("family_members")
		.doc(id)
		.get();
	return res.json(docRef.data());
});

app.post("/upload_image", upload.single("image"), async (req, res) => {
	const bucket = admin.storage().bucket();
	try {
		// Assuming that the image is sent as base64 data
		const { nameSurname } = req.body;
		const image = Buffer.from(req.file.buffer);

		// Define the destination path in the storage bucket
		const destination = `avatars/${nameSurname}.png`;

		// Upload the image to Firebase Storage

		// 'file' comes from the Blob or File API
		await bucket.file(destination).save(image);

		// Get the reference to the uploaded file
		const fileReference = bucket.file(destination);

		// Get the download URL
		const [url] = await fileReference.getSignedUrl({
			action: "read",
			expires: "03-09-2223", // Adjust the expiration date as needed
		});

		// Update the family member's avatar URL in Firestore
		const docRef = admin
			.firestore()
			.collection("family_members")
			.doc(nameSurname);
		await docRef.update({
			"src.avatar1": url,
		});

		return res.json({
			success: true,
			message: "Image uploaded successfully",
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error uploading image:", error);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

app.post("/test", async (req, res) => {
	const familyMembers = require("./familyMembersMissing.json");

	const bucket = admin.storage().bucket();

	for (const familyMember of familyMembers) {
		// Define the destination path in the storage bucket
		const file = "zimages/" + "罗花味" + ".png";
		const destination = "avatars/" + familyMember.nameSurname + ".png";

		await bucket.upload(file, {
			destination,
		});

		// Get the reference to the uploaded file
		const fileReference = bucket.file(destination);

		// Get the download URL
		const [url] = await fileReference.getSignedUrl({
			action: "read",
			expires: "03-09-2223", // Adjust the expiration date as needed
		});

		familyMember.src.avatar1 = url;
		const docRef = admin
			.firestore()
			.collection("family_members")
			.doc(familyMember.nameSurname);
		await docRef.set(familyMember);
	}
	return res.send("Success deck updating");
});

app.get("/all_family_members", async (req, res) => {
	const decksRef = admin.firestore().collection("family_members");
	const snapshot = await decksRef.get();
	const ris = [];
	snapshot.forEach((doc) => ris.push(doc.data()));
	return res.send(ris);
});

app.post("/update_deck", async (req, res) => {
	const { deckName, ydk } = req.body;
	let d = new Date();
	// Convert the local time to UTC
	d = new Date(
		d.getUTCFullYear(),
		d.getUTCMonth(),
		d.getUTCDate(),
		d.getUTCHours(),
		d.getUTCMinutes(),
		d.getUTCSeconds()
	);
	const deck = {
		ydk,
		deckName,
		date: d.toLocaleString("se-SE"),
	};
	const docRef = admin.firestore().collection("decks").doc(deckName);
	docRef
		.get()
		.then((doc) => {
			if (doc.exists) {
				// Document exists, update it
				return docRef.update({
					ydk: ydk,
					date: d.toLocaleString("se-SE"),
				});
			} else {
				// Document does not exist, create it
				return docRef.set(deck);
			}
		})
		.catch((error) => {
			console.log("Error deck updating:", error);
		});
	return res.send("Success deck updating");
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});

// Export the Express API
module.exports = app;
