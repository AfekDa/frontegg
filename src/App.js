import './App.css';
import { useAuth, useAuthActions, useLoginWithRedirect, ContextHolder, AdminPortal, useTenantsActions } from "@frontegg/react";
import { useEffect, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import { getVendorToken } from './utils/getVendorToken'; 

function App() {
  const { user, isAuthenticated, tenantsState } = useAuth(); 
  const { switchTenant } = useAuthActions(); 
  const { loadTenants } = useTenantsActions();
  const loginWithRedirect = useLoginWithRedirect();
  const [selectedTenant, setSelectedTenant] = useState('');
  const [newTenantDetails, setNewTenantDetails] = useState({
    name: '',
    website: '',
    creatorName: '',
    creatorEmail: '',
  });
  const [allTenants, setAllTenants] = useState([]); // State to store all tenants
  const [vendorToken, setVendorToken] = useState(''); // State to store the vendor token

  useEffect(() => {
    const fetchVendorToken = async () => {
      try {
        const token = await getVendorToken();
        setVendorToken(token); // Store the token in state
        console.log("Fetched vendor token:", token); 
      } catch (error) {
        console.error('Failed to fetch vendor token:', error);
      }
    };

    fetchVendorToken();
  }, []); // Fetch the vendor token on component mount

  useEffect(() => {
    if (!isAuthenticated) {
      loginWithRedirect().catch((error) => {
        console.error("Login redirect failed:", error);
      });
    }
  }, [isAuthenticated, loginWithRedirect]);

  useEffect(() => {
    if (!selectedTenant && tenantsState.tenants?.length > 0) {
      setSelectedTenant(tenantsState.tenants[0].tenantId); // Default to the first tenant in tenantsState
    } else if (!selectedTenant && user?.tenantIds?.length > 0) {
      setSelectedTenant(user.tenantIds[0]); // Fallback to the first tenant in user.tenantIds
    }
  }, [user, tenantsState, selectedTenant]); 

  useEffect(() => {
    const fetchAllTenants = async () => {
      try {
        if (!vendorToken) {
          console.warn("Vendor token is not available yet.");
          return;
        }

        if (!selectedTenant && !tenantsState.tenants?.length) {
          console.warn("No tenant ID or tenants available to fetch hierarchy.");
          return; // Exit early if no tenant ID or tenants are available
        }

        console.log("Current tenantsState:", tenantsState);

        const tenantId = selectedTenant || tenantsState.tenants?.[0]?.tenantId; // Use selectedTenant or the first tenant in tenantsState
        if (!tenantId) {
          console.error("No tenant ID available to fetch hierarchy.");
          return;
        }

        const response = await fetch('https://api.frontegg.com/tenants/resources/hierarchy/v1', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${vendorToken}`,
            'Content-Type': 'application/json',
            'frontegg-tenant-id': tenantId,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tenant hierarchy: ${response.statusText}`);
        }

        const hierarchy = await response.json(); 
        console.log("Parsed hierarchy response:", hierarchy); 
        

        // Extract only tenantId from hierarchy.tenants
        const hierarchyTenantIds = hierarchy.map((tenant) => tenant.tenantId);
        console.log("Extracted tenant IDs from hierarchy:", hierarchyTenantIds); // Log the extracted tenant IDs

        // Combine the current tenant IDs and sub-tenant IDs into a single list
        const combinedTenantIds = [
          ...(tenantsState.tenants?.map((tenant) => tenant.tenantId) || []), // Extract tenantId from tenantsState.tenants
          ...hierarchyTenantIds, // Include tenant IDs from the hierarchy
        ];

        console.log("Combined tenant IDs:", combinedTenantIds); 

        setAllTenants(combinedTenantIds); 
      } catch (error) {
        console.error("Failed to fetch tenant hierarchy:", error);
      }
    };

    fetchAllTenants();
  }, [selectedTenant, tenantsState, vendorToken]); // Refetch tenant hierarchy when vendorToken changes

  useEffect(() => {
    // Log tenantsState whenever it updates
    console.log("Updated Tenants State:", tenantsState);
  }, [tenantsState]); // Runs whenever tenantsState changes

  const handleSwitchTenant = async (tenantId) => {
    try {
      console.log(`Attempting to switch to tenant: ${tenantId}`);
      await switchTenant({ tenantId, silentReload: true }); // Switch tenant

      // check if the tenant switch was successful
      const currentTenant = tenantsState.tenants?.find((tenant) => tenant.tenantId === tenantId);
      if (!currentTenant) {
        throw new Error(`Failed to switch to tenant: ${tenantId}. Tenant not found in the current state.`);
      }

      console.log(`Switched to tenant: ${tenantId}`);
      await loadTenants(); // Reload tenants to reflect the new tenant
      console.log("Tenants reloaded.");
    } catch (error) {
      console.error("Failed to switch tenant:", error);

      if (error.response) {
        try {
          const errorData = await error.response.json(); // Parse the error response body
          console.error("Error response data:", errorData);
          alert(`Failed to switch tenant: ${errorData.message || "Unknown error occurred."}`);
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          alert("Failed to switch tenant. Please try again.");
        }
      } else {
        alert(`Failed to switch tenant. Please try again. Error: ${error.message}`);
      }
    }
  };

  const handleCreateTenant = async () => {
    if (!vendorToken) {
      alert("Vendor token is not available. Please try again later.");
      return;
    }

    const tenantData = {
      name: newTenantDetails.name,
      website: newTenantDetails.website,
      creatorName: newTenantDetails.creatorName,
      creatorEmail: newTenantDetails.creatorEmail,
    };

    try {
      // Step 1: Create the tenant
      const response = await fetch('https://api.frontegg.com/tenants/resources/tenants/v1', { 
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vendorToken}`, 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
      });

      console.log("API Response Status:", response.status); // Log response status
      const responseBody = await response.json();
      console.log("API Response Body:", responseBody); // Log response body

      if (!response.ok) {
        throw new Error(`Failed to create tenant: ${response.statusText}`);
      }

      alert(`Tenant created successfully: ${responseBody.name}`);
      setNewTenantDetails({ name: '', website: '', creatorName: '', creatorEmail: '' }); // Reset form

      const tenantId = responseBody.tenantId;
      const signupRequestBody = {
        provider: "local",
        email: newTenantDetails.creatorEmail,
        name: newTenantDetails.creatorName,
        tenantId: tenantId,
        metadata: JSON.stringify({}), // Ensure metadata is a JSON string
        companyName: newTenantDetails.name,
        skipInviteEmail: true, 
        roleIds: [], 
      };

      console.log("Signup Request Body:", signupRequestBody); 

      const signupResponse = await fetch('https://api.frontegg.com/identity/resources/users/v1/signUp', { 
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vendorToken}`, 
          'Content-Type': 'application/json',
          'frontegg-application-id': 'fe5f039f-4cce-4556-92a7-a3e11bbf1c35', 
          'frontegg-vendor-host': 'app-569bcb21sjhg.frontegg.com', 
        },
        body: JSON.stringify(signupRequestBody),
      });

      if (!signupResponse.ok) {
        const errorResponse = await signupResponse.json();
        console.error("Signup API Error Response:", errorResponse);
        throw new Error(`Failed to signup user: ${signupResponse.statusText}`);
      }

      console.log(`User signed up and associated with tenant ${tenantId}`);

      // Step 3: Reload tenants list
      await loadTenants();
      console.log("Tenants list reloaded.");

      // Step 4: Add the new tenant as a sub-tenant of the current tenant
      const hierarchyRequestBody = {
        parentTenantId: selectedTenant,
        childTenantId: tenantId, 
      };

      console.log("Hierarchy Request Body:", hierarchyRequestBody); 

      const hierarchyResponse = await fetch('https://api.frontegg.com/tenants/resources/hierarchy/v1', { 
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vendorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hierarchyRequestBody),
      });

      if (!hierarchyResponse.ok) {
        const errorResponse = await hierarchyResponse.json();
        console.error("Hierarchy API Error Response:", errorResponse); // Log the error response for debugging
        throw new Error(`Failed to add sub-tenant: ${hierarchyResponse.statusText}`);
      }

      console.log(`Tenant ${tenantId} added as a sub-tenant of ${selectedTenant}`);
    } catch (error) {
      console.error("Failed to create tenant or signup user:", error);
      alert("Failed to create tenant or signup user. Please try again.");
    }
  };

  const fetchTenantsDirectly = async () => {
    if (!vendorToken) {
      console.warn("Vendor token is not available yet.");
      return;
    }

    try {
      const response = await fetch('https://api.frontegg.com/tenants/resources/tenants/v1', { // Updated URL
        method: 'GET',
        headers: {
          Authorization: `Bearer ${vendorToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tenants: ${response.statusText}`);
      }

      const tenants = await response.json();
      console.log("Fetched Tenants:", tenants);
    } catch (error) {
      console.error("Failed to fetch tenants directly:", error);
    }
  };

  const logout = () => {
    try {
      const baseUrl = ContextHolder.getContext().baseUrl;
      window.location.href = `${baseUrl}/oauth/logout?post_logout_redirect_uri=${window.location}`;
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openAdminPortal = () => {
    AdminPortal.show();
  };

  return (
    <div className="App">
      {isAuthenticated ? (
        <div>
          <div>
            <img src={user?.profilePictureUrl} alt={user?.name} />
          </div>
          <div>
            <span>Logged in as: {user?.name}</span>
          </div>
          {/* Tenant Switch Drop-Down */}
          <div>
            <label htmlFor="tenant-select">Switch Tenant:</label>
            <select
              id="tenant-select"
              value={selectedTenant}
              onChange={(e) => {
                setSelectedTenant(e.target.value);
                handleSwitchTenant(e.target.value);
              }}
            >
              {allTenants.map((tenantId, index) => (
                <option key={`${tenantId}-${index}`} value={tenantId}>
                  {tenantId} {/* Display tenantId */}
                </option>
              ))}
            </select>
          </div>
          {/* Create New Tenant */}
          <div className="create-tenant-container">
            <h3>Create New Tenant</h3>
            <form className="create-tenant-form">
              <label htmlFor="tenant-name">Tenant Name</label>
              <input
                id="tenant-name"
                type="text"
                placeholder="Enter Tenant Name"
                value={newTenantDetails.name}
                onChange={(e) => setNewTenantDetails({ ...newTenantDetails, name: e.target.value })}
              />
              <label htmlFor="tenant-website">Website</label>
              <input
                id="tenant-website"
                type="text"
                placeholder="Enter Website"
                value={newTenantDetails.website}
                onChange={(e) => setNewTenantDetails({ ...newTenantDetails, website: e.target.value })}
              />
              <label htmlFor="creator-name">Creator Name</label>
              <input
                id="creator-name"
                type="text"
                placeholder="Enter Creator Name"
                value={newTenantDetails.creatorName}
                onChange={(e) => setNewTenantDetails({ ...newTenantDetails, creatorName: e.target.value })}
              />
              <label htmlFor="creator-email">Creator Email</label>
              <input
                id="creator-email"
                type="email"
                placeholder="Enter Creator Email"
                value={newTenantDetails.creatorEmail}
                onChange={(e) => setNewTenantDetails({ ...newTenantDetails, creatorEmail: e.target.value })}
              />
              <button type="button" onClick={handleCreateTenant}>
                Create Tenant
              </button>
            </form>
          </div>
          <div>
            <button onClick={() => alert(user.accessToken)}>My access token?</button>
          </div>

          {/* Settings Button - Opens Frontegg Admin Portal */}
          <div>
            <button onClick={fetchTenantsDirectly}>Fetch Tenants Directly</button>
          </div>
          {/* Fetch Tenants Directly Button */}
          <div>
            <button className="settings-button" onClick={openAdminPortal}>
              <FaCog className="settings-icon" /> Settings
            </button>
          </div>
          <div>
            <button onClick={logout}>Click to logout</button>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => loginWithRedirect()}>Click me to login</button>
        </div>
      )}
    </div>
  );
}

export default App;
