const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

export const callEdgeFunction = async (
  functionName: string,
  body: any,
  token?: string
) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};

export const streamEdgeFunction = async (
  functionName: string,
  body: any,
  token?: string
) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.body;
};