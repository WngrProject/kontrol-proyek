import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCo-CYydpivABwE3NFJOaM45yT-nO1f4OY",
    authDomain: "wngr-project.firebaseapp.com",
    databaseURL: "https://wngr-project-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wngr-project",
    storageBucket: "wngr-project.firebasestorage.app",
    messagingSenderId: "914234632159",
    appId: "1:914234632159:web:787cdddbfb6490650fc66a",
    measurementId: "G-CETR8CFN2R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
