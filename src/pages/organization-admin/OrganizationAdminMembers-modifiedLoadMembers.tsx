// Modified loadMembers function that better handles user data issues
// Copy and use this as a replacement for the existing loadMembers function

const loadMembers = async (orgId = organizationId) => {
  if (!orgId) return;
  
  try {
    setLoading(true);
    console.log("Loading members for organization:", orgId);
    
    // First try a simple query to test if we can access organization_members table
    try {
      const { data: testData, error: testError } = await supabase
        .from("organization_members")
        .select("id")
        .limit(1);
        
      if (testError) {
        console.error("Test query failed:", testError);
        throw testError;
      }
      
      console.log("Test query succeeded, found", testData?.length || 0, "results");
    } catch (testErr) {
      console.error("Test query exception:", testErr);
    }
    
    // Now try the actual query
    try {
      // Get the members first
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select(`
          id, 
          farmer_id, 
          role, 
          status, 
          join_date
        `)
        .eq("organization_id", orgId);
        
      if (memberError) {
        console.error("Member query failed:", memberError);
        throw memberError;
      }
      
      console.log("Found", memberData?.length || 0, "members");
      
      if (!memberData || memberData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }
      
      // Create simplified members without farmer details for now
      const simplifiedMembers = memberData.map(member => ({
        id: member.id,
        farmer_id: member.farmer_id,
        role: member.role || 'member',
        status: member.status || 'active',
        join_date: member.join_date,
        farmer: {
          user_id: "",
          full_name: "Loading...",
          phone: "",
          email: "",
          farm_name: ""
        }
      }));
      
      // Set members with basic info first - this provides a faster initial UI update
      setMembers(simplifiedMembers);
      
      // Get a list of farmer IDs
      const farmerIds = memberData.map(m => m.farmer_id);
      
      // Try to get the farmer profiles
      try {
        const { data: farmerData, error: farmerError } = await supabase
          .from("farmer_profiles")
          .select(`id, user_id, farm_name`)
          .in('id', farmerIds);
          
        if (farmerError) {
          console.error("Farmer profile query failed:", farmerError);
          // We'll continue with simplified data
          setLoading(false);
          return;
        }
        
        console.log("Found", farmerData?.length || 0, "farmer profiles");
        
        if (!farmerData || farmerData.length === 0) {
          setLoading(false);
          return; // Keep using simplified members
        }
        
        // Now try to enhance with user data
        try {
          // Get user IDs from farmer profiles
          const userIds = farmerData
            .map(f => f.user_id)
            .filter(id => id && id.length > 0);
            
          if (userIds.length === 0) {
            console.log("No valid user IDs found in farmer profiles");
            
            // Update with farmer data at least
            const enhancedWithFarmerOnly = addFarmDataOnly(simplifiedMembers, farmerData);
            setMembers(enhancedWithFarmerOnly);
            setLoading(false);
            return;
          }
          
          // Try each approach in sequence for fetching user data
          
          // Approach 1: Standard Supabase query
          try {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select(`id, first_name, last_name, email, phone`)
              .in('id', userIds);
            
            if (userError) {
              console.error("User details query failed:", userError);
              throw userError; // Try next approach
            }
            
            if (userData && userData.length > 0) {
              const enhancedMembers = combineData(simplifiedMembers, farmerData, userData);
              setMembers(enhancedMembers);
              setLoading(false);
              return;
            } else {
              throw new Error("No user data returned"); // Try next approach
            }
          } catch (stdApproachError) {
            console.error("Standard approach failed:", stdApproachError);
            
            // Approach 2: Direct API fetch
            try {
              const userData = await fetchUserDetailsDirectly(userIds);
              
              if (userData && userData.length > 0) {
                const enhancedMembers = combineData(simplifiedMembers, farmerData, userData);
                setMembers(enhancedMembers);
                setLoading(false);
                return;
              } else {
                throw new Error("No user data from direct API"); // Fall back to placeholder
              }
            } catch (directApiError) {
              console.error("Direct API approach failed:", directApiError);
              
              // Fall back to placeholder data
              const placeholderMembers = createMembersWithPlaceholderData(farmerData, simplifiedMembers);
              setMembers(placeholderMembers);
              setLoading(false);
              return;
            }
          }
        } catch (userEnhanceError) {
          console.error("User enhancement error:", userEnhanceError);
          
          // Fall back to just farmer data
          const enhancedWithFarmerOnly = addFarmDataOnly(simplifiedMembers, farmerData);
          setMembers(enhancedWithFarmerOnly);
        }
      } catch (farmerFetchError) {
        console.error("Error fetching farmer profiles:", farmerFetchError);
        // Just use the simplified members
      }
    } catch (membersError) {
      console.error("Members query error:", membersError);
      
      // Try organization service approach as fallback
      try {
        console.log("Trying service approach...");
        const membersData = await organizationService.getOrganizationMembers(orgId);
        
        if (membersData && membersData.length > 0) {
          const simplifiedMembers = membersData.map(member => ({
            id: member.id,
            farmer_id: member.farmer_id,
            role: member.role || 'member',
            status: member.status || 'active',
            join_date: member.join_date,
            farmer: {
              user_id: "",
              full_name: "Member #" + member.id.substring(0, 8),
              phone: "Not available",
              email: "Not available",
              farm_name: "Not available"
            }
          }));
          
          setMembers(simplifiedMembers);
          setLoading(false);
          return;
        }
      } catch (serviceError) {
        console.error("Service approach failed:", serviceError);
      }
      
      // Set empty list as last resort
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      });
      setMembers([]);
    }
  } catch (error) {
    console.error("Error in loadMembers:", error);
    setMembers([]);
  } finally {
    setLoading(false);
  }
};

// Helper function to add farm data without user details
const addFarmDataOnly = (members, farmerData) => {
  const farmerMap = farmerData.reduce((acc, farmer) => {
    acc[farmer.id] = farmer;
    return acc;
  }, {});
  
  return members.map(member => {
    const farmerProfile = farmerMap[member.farmer_id];
    if (!farmerProfile) return member;
    
    return {
      ...member,
      farmer: {
        ...member.farmer,
        user_id: farmerProfile.user_id || "",
        farm_name: farmerProfile.farm_name || "Unknown Farm",
        full_name: "Farmer #" + member.id.substring(0, 8)
      }
    };
  });
};

// Helper function to combine all data
const combineData = (members, farmerData, userData) => {
  const farmerMap = farmerData.reduce((acc, farmer) => {
    acc[farmer.id] = farmer;
    return acc;
  }, {});
  
  const userMap = userData.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
  
  return members.map(member => {
    const farmerProfile = farmerMap[member.farmer_id];
    if (!farmerProfile) return member;
    
    const user = userMap[farmerProfile.user_id];
    if (!user) {
      return {
        ...member,
        farmer: {
          ...member.farmer,
          user_id: farmerProfile.user_id || "",
          farm_name: farmerProfile.farm_name || "Unknown Farm",
          full_name: "Farmer #" + member.id.substring(0, 8)
        }
      };
    }
    
    return {
      ...member,
      farmer: {
        user_id: farmerProfile.user_id,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || "Unknown Farmer",
        phone: user.phone || "Not available",
        email: user.email || "Not available",
        farm_name: farmerProfile.farm_name || "Unknown Farm"
      }
    };
  });
}; 