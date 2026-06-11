import axios from "axios";

const API = "http://localhost:8000";

//receipt upload
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${API}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export const askQuestion = async (question, sessionId) => {
  const res = await axios.post(`${API}/query`, { message: question, session_id: sessionId });
  return res.data;
};

export const ingestion = async ()=>{
  const res = await axios.post(`${API}/initiate-ingest`);
  return res.data;
}

export const checkPolicyIngested = async ()=>{
  const res = await axios.get(`${API}/check-ingest`);
  return res.data;
}

export const createSession = async () => {
  const res = await axios.post(`${API}/session`);
  return res.data;
}

export const getHistory = async (sessionId) => {
  const res = await axios.get(`${API}/history/${sessionId}`);
  return res.data;
}
