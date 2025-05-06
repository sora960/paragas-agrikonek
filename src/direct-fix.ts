// PASTE THIS FUNCTION ANYWHERE BEFORE THE RETURN STATEMENT:

// Helper function to create members with placeholder data when user details can't be loaded
const createMembersWithPlaceholderData = (farmerData, simplifiedMembers) => {
  console.log("Using placeholder data for users");
  
  // Create a map of farmer profiles
  const farmerMap = farmerData.reduce((acc, farmer) => {
    acc[farmer.id] = farmer;
    return acc;
  }, {} as Record<string, any>);
  
  // Create members with available farmer data but placeholder user data
  return simplifiedMembers.map(member => {
    const farmerProfile = farmerMap[member.farmer_id];
    if (!farmerProfile) return member;
    
    return {
      ...member,
      farmer: {
        user_id: farmerProfile.user_id || "",
        full_name: "Farmer #" + member.id.substring(0, 8),
        phone: "Not available",
        email: "Not available",
        farm_name: farmerProfile.farm_name || "Unknown Farm"
      }
    };
  });
};

// THEN, FIND AND REPLACE THE CODE BELOW (AROUND LINE 290-310):
/*
if (farmerIds.length > 0) {
  const { data: farmerData, error: farmerError } = await supabase
    .from("farmer_profiles")
    .select(`id, user_id, farm_name`)
    .in('id', farmerIds);
    
  if (farmerError) {
    console.error("Farmer profile query failed:", farmerError);
    throw farmerError;
  }
  
  console.log("Found", farmers?.length || 0, "farmer profiles");
}

// Full query with simplified approach
const { data, error } = await supabase
  .from("organization_members")
  .select(`
    id, 
    farmer_id, 
    role, 
    status, 
    join_date
  `)
  .eq("organization_id", orgId);
*/

// WITH THIS CODE:

if (farmerIds.length > 0) {
  const { data: farmerData, error: farmerError } = await supabase
    .from("farmer_profiles")
    .select(`id, user_id, farm_name`)
    .in('id', farmerIds);
    
  if (farmerError) {
    console.error("Farmer profile query failed:", farmerError);
    // Continue with simplified data instead of throwing
    console.log("Using simplified data due to farmer profile error");
  } else {
    console.log("Found", farmerData?.length || 0, "farmer profiles");
    
    try {
      // Try to enhance with user data
      if (farmerData && farmerData.length > 0) {
        // Extract user IDs from farmer profiles
        const userIds = farmerData
          .map(f => f.user_id)
          .filter(id => id && id.length > 0);
          
        if (userIds.length > 0) {
          try {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select(`id, first_name, last_name, email, phone`)
              .in('id', userIds);
            
            if (userError) {
              console.error("User details query failed:", userError);
              // Use placeholder data instead of failing
              const placeholderMembers = createMembersWithPlaceholderData(farmerData, simplifiedMembers);
              setMembers(placeholderMembers as Member[]);
              setLoading(false);
              return; // Exit early since we've handled the data
            } else if (userData && userData.length > 0) {
              // Successfully got user data, proceed with enhancing members
              const farmerMap = farmerData.reduce((acc, farmer) => {
                acc[farmer.id] = farmer;
                return acc;
              }, {} as Record<string, any>);
              
              const userMap = userData.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
              }, {} as Record<string, any>);
              
              const enhancedMembers = simplifiedMembers.map(member => {
                const farmerProfile = farmerMap[member.farmer_id];
                if (!farmerProfile) return member;
                
                const user = userMap[farmerProfile.user_id];
                if (!user) return {
                  ...member,
                  farmer: {
                    ...member.farmer,
                    farm_name: farmerProfile.farm_name || ""
                  }
                };
                
                return {
                  ...member,
                  farmer: {
                    user_id: farmerProfile.user_id,
                    full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || "Unknown Farmer",
                    phone: user.phone || "",
                    email: user.email || "",
                    farm_name: farmerProfile.farm_name || ""
                  }
                };
              });
              
              setMembers(enhancedMembers as Member[]);
              setLoading(false);
              return; // Exit early since we've handled the data
            }
          } catch (userError) {
            console.error("Exception getting user data:", userError);
            // Fall through to placeholder data
          }
        }
        
        // If we get here, either userIds was empty or there was some error with user data
        // Use placeholder data with just farmer info
        const placeholderMembers = createMembersWithPlaceholderData(farmerData, simplifiedMembers);
        setMembers(placeholderMembers as Member[]);
        setLoading(false);
        return; // Exit early
      }
    } catch (enhanceError) {
      console.error("Error enhancing member data:", enhanceError);
      // Fall through to continue with the normal flow
    }
  }
}

// Continue with the original simplified approach if we haven't returned yet
const { data, error } = await supabase
  .from("organization_members")
  .select(`
    id, 
    farmer_id, 
    role, 
    status, 
    join_date
  `)
  .eq("organization_id", orgId); 