export const getVendorToken = async () => {
  const clientId = 'c8c4f00f-5057-482f-ab2e-68dfaf5dc8ce'; // Replace with your Client ID
  const secret = 'ddee012c-a426-4188-a5b7-05e2b9d9318a'; // Replace with your Secret

  try {
    const response = await fetch('https://api.frontegg.com/auth/vendor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId, secret }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vendor token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.token; // Correctly extract the token property
  } catch (error) {
    console.error('Error fetching vendor token:', error);
    throw error;
  }
};
