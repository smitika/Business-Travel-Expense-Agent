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

export const askQuestion = async (question, sessionId) => {
  const res = await axios.post(`${API}/query`, { message: question, session_id: sessionId });
  return res.data;
};

export const ingestion = async (policy_id, policy_path) => {
    const res = await axios.post(`${API}/initiate-ingest`, {
        policy_id,
        policy_path
    });
    return res.data;
};

export const checkPolicyIngested = async (policy_id) => {
  const res = await axios.get(`${API}/check-ingest/${policy_id}`);
  return res.data;
}

export const activate_policy = async (policy_id) => {
  const res = await axios.post(`${API}/activate-policy/${policy_id}`);
  return res.data;
}

export const deactivate_policy = async (policy_id) => {
  const res = await axios.post(`${API}/deactivate-policy/${policy_id}`);
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

export const fetch_policies = async () => {
  const res = await axios.get(`${API}/policies`);
  return res.data;
}

export const upload_policy = async (file,validFrom,validTo) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("valid_from", validFrom);
  formData.append("valid_to", validTo);
  const res = await axios.post(`${API}/upload-policy`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const get_active_policies = async()=>{
  const res = await axios.get(`${API}/get-active-policies`);
  return res.data;
}

export const create_admin_session = async(data)=>{
  const res = await axios.post(`${API}/admin-chat-session`,data);
  return res.data;
}

export const chat =async(data)=>{
  const res = await axios.post(`${API}/chat`,data);
  return res.data;
}

export const create_employee_claim_session = async (data) => {
  const res = await axios.post(`${API}/employee-claim-session`, data);
  return res.data;
}

export const create_employee_travel_session = async () => {
  const res = await axios.post(`${API}/employee-travel-session`);
  return res.data;
}