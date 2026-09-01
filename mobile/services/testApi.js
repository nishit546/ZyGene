import API from "./api";

export const testServer = async () => {
  try {
    const response = await API.get("/health");

    console.log("Server response:", response.data);

    return response.data;
  } catch (error) {
    console.log(
      "Server connection error:",
      error.message
    );

    throw error;
  }
};