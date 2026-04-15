import { getAccessToken, getRefreshToken, setAccessToken } from "./auth-api";

export async function request(endpoint, options = {}, retry = true) {
    try {
        const token = typeof window !== 'undefined' ? getAccessToken() : null;

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`http://localhost:3000/api${endpoint}`, {
            ...options,
            headers,
            credentials: 'include'
        });

        const contentType = response.headers.get('content-type');
        let data = null;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            return {
                success: false,
                error: {
                    message: text || "Server returned non-JSON response",
                }
            };
        }

        if (
            response.status === 401 &&
            retry &&
            endpoint !== "/auth/refresh" &&
            endpoint !== "/auth/login"
        ) {
            refreshAccessToken();
            return request(endpoint, options, false);
        }

        if (!response.ok) {
            console.log(`${data.error?.message || 'An error occurred'}`);
        }

        return data;
    } catch {
        return {
            success: false
        };
    }
}

export async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await fetch(`http://localhost:3000/api/auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
        credentials: 'include'
    });

    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        throw new Error(
          `Token refresh failed: Server returned non-JSON response (${response.status})`
        );
    }

    if (!response.ok) {
        throw new Error(data.error?.message || 'Token refresh failed');
    }

    if (data.success && data.data?.accessToken) {
        setAccessToken(data.data.accessToken);
    }
}
