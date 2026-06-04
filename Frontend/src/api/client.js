import axios from "axios";

const API = "https://business-travel-expense-agent.onrender.com";

//receipt upload
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${API}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export const askQuestion = async (question) => {
  const res = await axios.post(`${API}/query`, { message: question });
  return res.data;
};