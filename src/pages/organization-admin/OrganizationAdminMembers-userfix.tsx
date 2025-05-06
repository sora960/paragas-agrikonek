import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Modified user details handling in loadMembers function:
const handleUserDataFetch = async (farmerIds, farmerData, simplifiedMembers) => {
  try {
    // Get user IDs from farmer profiles
    const userIds = farmerData
      .map(f => f.user_id)
      .filter(id => id && id.length > 0);
      
    if (userIds.length === 0) {
      console.log("No valid user IDs found in farmer profiles");
      return simplifiedMembers;
    }
    
    // First try to get users with a simpler query
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .in('id', userIds)
        .limit(1);
        
      if (userError) {
        console.error("Simple user query failed:", userError);
        throw userError;
      }
      
      console.log("Simple user query succeeded");
    } catch (simpleErr) {
      console.error("Simple user query exception:", simpleErr);
    }
    
    // Try fetching user details
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`id, first_name, last_name, email, phone`)
        .in('id', userIds);
      
      if (userError) {
        console.error("User details query failed:", userError);
        // Fallback to creating members with placeholder user data
        return createMembersWithPlaceholderData(farmerData, simplifiedMembers);
      }
      
      if (!userData || userData.length === 0) {
        console.warn("No user data returned");
        return createMembersWithPlaceholderData(farmerData, simplifiedMembers);
      }
      
      // Create maps for lookup
      const farmerMap = farmerData.reduce((acc, farmer) => {
        acc[farmer.id] = farmer;
        return acc;
      }, {});
      
      const userMap = userData.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      // Enhance members with farmer and user data
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
      
      return enhancedMembers;
    } catch (detailsErr) {
      console.error("User details exception:", detailsErr);
      return createMembersWithPlaceholderData(farmerData, simplifiedMembers);
    }
  } catch (error) {
    console.error("Error enhancing member data:", error);
    return simplifiedMembers; // Return original simplified members
  }
};

// Fallback function to create members with placeholder data
const createMembersWithPlaceholderData = (farmerData, simplifiedMembers) => {
  console.log("Using placeholder data for users");
  
  // Create a map of farmer profiles
  const farmerMap = farmerData.reduce((acc, farmer) => {
    acc[farmer.id] = farmer;
    return acc;
  }, {});
  
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

// Direct API approach for user details as a last resort
const fetchUserDetailsDirectly = async (userIds) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2VleHVlcGZva25qeHB5bG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY0MTcyMzksImV4cCI6MjAzMTk5MzIzOX0.nOE0hOyIxeDPp7UlHJUEjRB_rvQo3eMQvLwWJkNLPJ4';
    
    const idList = userIds.join(',');
    const url = `${supabaseUrl}/rest/v1/users?id=in.(${idList})`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Direct API user fetch failed:", error);
    return [];
  }
}; 