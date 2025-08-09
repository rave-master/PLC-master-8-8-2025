// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBjYPyVv9qC88JGD8N1tnDZLT0hh1sZUtQ",
  authDomain: "locator-66521.firebaseapp.com",
  projectId: "locator-66521",
  storageBucket: "locator-66521.appspot.com", // <-- fix typo here (was .app)
  messagingSenderId: "322028471975",
  appId: "1:322028471975:web:ee77430c76935588187d82",
  measurementId: "G-S87YVN1RX4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Elements
const authSection = document.getElementById("auth-section");
const profileForm = document.getElementById("profile-form");
const statusForm = document.getElementById("status-form");
const dashboardLink = document.getElementById("go-dashboard");
const photoInput = document.getElementById("photos");
const photoPreview = document.getElementById("profile-photo-preview");

// Show photo preview on file select
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      photoPreview.src = reader.result;
      photoPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
});

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authSection.classList.add("hidden");
    profileForm.classList.remove("hidden");
    statusForm.classList.remove("hidden");
    dashboardLink.classList.remove("hidden");

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("name").value = data.name || "";
      document.getElementById("designation").value = data.designation || "";
      if (data.photoURL) {
        photoPreview.src = data.photoURL;
        photoPreview.classList.remove("hidden");
      }
      if (data.weeklyStatus) {
        document.getElementById("monday-status").value = data.weeklyStatus.monday || "";
        document.getElementById("tuesday-status").value = data.weeklyStatus.tuesday || "";
        document.getElementById("wednesday-status").value = data.weeklyStatus.wednesday || "";
        document.getElementById("thursday-status").value = data.weeklyStatus.thursday || "";
        document.getElementById("friday-status").value = data.weeklyStatus.friday || "";
      }
    }
  } else {
    authSection.classList.remove("hidden");
    profileForm.classList.add("hidden");
    statusForm.classList.add("hidden");
    dashboardLink.classList.add("hidden");
  }
});

// Register
window.register = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Registered successfully!");
  } catch (error) {
    alert("Registration error: " + error.message);
  }
};

// Login
window.login = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Logged in!");
  } catch (error) {
    alert("Login error: " + error.message);
  }
};

// Logout
window.logout = async () => {
  await signOut(auth);
  alert("Logged out.");
};

// Unified Submit Profile and Weekly Status
window.submitProfile = async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  const name = document.getElementById("name").value.trim();
  const designation = document.getElementById("designation").value.trim();
  const file = photoInput.files[0];

  if (!name || !designation) {
    alert("Please fill in all required fields.");
    return;
  }

  let photoURL = "";

  if (file) {
    try {
      const photoRef = ref(storage, `photos/${user.uid}`);
      await uploadBytes(photoRef, file);
      photoURL = await getDownloadURL(photoRef);
    } catch (err) {
      alert("Photo upload failed: " + err.message);
      return;
    }
  } else {
    // Keep existing photo if no new file selected
    const existingDoc = await getDoc(doc(db, "users", user.uid));
    if (existingDoc.exists()) {
      photoURL = existingDoc.data().photoURL || "";
    }
  }

  const weeklyStatus = {
    monday: document.getElementById("monday-status").value,
    tuesday: document.getElementById("tuesday-status").value,
    wednesday: document.getElementById("wednesday-status").value,
    thursday: document.getElementById("thursday-status").value,
    friday: document.getElementById("friday-status").value,
  };

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        name,
        designation,
        photoURL,
        weeklyStatus,
      },
      { merge: true }
    );
    alert("Profile and weekly status updated successfully!");
  } catch (err) {
    alert("Error saving profile: " + err.message);
  }
};
