/* eslint-disable */
// import axios from "axios";
import { showAlert } from "./alerts.mjs";

export const login = async (email, password) => {
  try {
    // console.log("Him there");
    const res = await axios({
      method: "POST",
      url: "http://127.0.0.1:5000/api/v1/users/login",
      data: {
        email,
        password,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Logged in successfully!");
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const logout = async () => {
  try {
    console.log("im working form logout form");
    const res = await axios({
      method: "GET",
      url: "http://127.0.0.1:5000/api/v1/users/logout",
    });
    if ((res.data.status = "success"))
      location.reload(true);
  } catch (err) {
    console.log("erorr logging out");
    console.log(err);
    showAlert("error", "Error logging out! Try again.");
  }
};
