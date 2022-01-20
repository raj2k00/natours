/* eslint-disable */
// import "@babel/polyfill";
import { displayMap } from "./mapbox.mjs";
import { login, logout } from "./login.mjs";
import { updateSettings } from "./updateSettings.mjs";
import { bookTour } from "./stripe.mjs";

// DOM ELEMENTS
const mapBox = document.getElementById("map");
const loginForm = document.querySelector(".form--login");
const logOutBtn = document.querySelector(
  ".nav__el--logout"
);
const userDataForm = document.querySelector(
  ".form-user-data"
);
const userPasswordForm = document.querySelector(
  ".form-user-password"
);
const bookBtn = document.getElementById("book-tour");

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm)
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password =
      document.getElementById("password").value;
    login(email, password);
  });

if (logOutBtn) logOutBtn.addEventListener("click", logout);

if (userDataForm)
  userDataForm.addEventListener("submit", (e) => {
    e.preventDefault();
    // create multipart form data to upload files
    const form = new FormData();
    form.append(
      "name",
      document.getElementById("name").value
    );
    form.append(
      "email",
      document.getElementById("email").value
    );
    form.append(
      "photo",
      document.getElementById("photo").files[0]
    );
    updateSettings(form, "data");
  });

if (userPasswordForm)
  userPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.querySelector(
      ".btn--save-password"
    ).textContent = "Updating...";

    const password = document.getElementById(
      "password-current"
    ).value;
    const newPassword =
      document.getElementById("password").value;
    const passwordConfirm = document.getElementById(
      "password-confirm"
    ).value;
    await updateSettings(
      { password, newPassword, passwordConfirm },
      "password"
    );

    document.querySelector(
      ".btn--save-password"
    ).textContent = "Save password";
    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });

if (bookBtn) {
  bookBtn.addEventListener("click", (e) => {
    e.target.textContent = "Processing...";
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
