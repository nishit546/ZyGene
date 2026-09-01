import API from "./api";

export const testAuthenticatedRequest = async () => {
  try {
    const response = await API.get("/fields");

    console.log(
      "AUTHENTICATED RESPONSE:",
      response.data
    );

    return response.data;

  } catch (error) {
    console.log(
      "AUTHENTICATED REQUEST ERROR:",
      error.response?.data || error.message
    );

    throw error;
  }
};