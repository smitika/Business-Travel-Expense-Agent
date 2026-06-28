import axios from "axios";

const API = "https://business-travel-expense-agent-new.onrender.com";
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

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

export const employee_login = async (data) => {
  // 1. Manually build a standard URL-encoded string
  const payload = `username=${encodeURIComponent(data.emp_id)}&password=${encodeURIComponent(data.password)}`;

  // 2. Pass the plain string directly as the body
  const res = await axios.post(
    `${API}/login`, 
    payload, 
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }
  );
  
  return res.data;
};

export const admin_login = async (data) => {
  // 1. Manually build a standard URL-encoded string
  const payload = `username=${encodeURIComponent(data.admin_id)}&password=${encodeURIComponent(data.password)}`;

  // 2. Pass the plain string directly as the body
  const res = await axios.post(
    `${API}/admin-login`, 
    payload, 
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }
  );
  
  return res.data;
};

export const get_my_claims = async () => {
  const res = await axios.get(`${API}/my-claims`);
  return res.data;
};

export const validate_travel = async (body) => {
  const res = await axios.post(`${API}/claims/validate-travel`, body);
  return res.data;
};

export const submit_claim = async (formData) => {
  const res = await axios.post(`${API}/claims/submit-claim`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

export const claim_details = async (claim_id) =>{
  const res = await axios.get(`${API}/claims/${claim_id}/details`);
  return res.data;
}

export const day_details = async (claim_id,day_number)=>{
  const res= await axios.get(`${API}/claims/${claim_id}/days/${day_number}/details`);
  return res.data;
}

export const populate_policy = async (policy_id, file_path) => {
  const res = await axios.post(`${API}/populate-policy`, { policy_id, file_path });
  return res.data;
};

export const revoke_policy = async (policy_id) => {
  const res = await axios.post(`${API}/revoke-policy`, { policy_id });
  return res.data;
};

export const get_policies_populate = async () => {
  const res = await axios.get(`${API}/populate-fetch-policies`);
  return res.data;
};

export const get_flagged_receipts = async () => {
  const res = await axios.get(`${API}/admin/flagged-receipts`);
  return res.data;
};

export const get_flagged_receipt_details = async (upload_id) => {
  const res = await axios.get(`${API}/admin/flagged-receipts/${upload_id}`);
  return res.data;
};

export const approve_flagged_receipt = async (upload_id, approval_reason) => {
  const res = await axios.post(`${API}/admin/flagged-receipts/${upload_id}/approve`, { approval_reason });
  return res.data;
};

export const reject_flagged_receipt = async (upload_id, rejection_reason) => {
  const res = await axios.post(`${API}/admin/flagged-receipts/${upload_id}/reject`, { rejection_reason });
  return res.data;
};