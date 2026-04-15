const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function api(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type');
  let data = null;
  
  if (contentType?.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    return { success: false, error: { message: text || 'Invalid response' } };
  }

  if (!res.ok) {
    return {
      success: false,
      error: data?.error || { message: data?.message || 'Request failed' },
      status: res.status,
    };
  }

  return data;
}
