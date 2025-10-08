interface ActiveCampaignContactData {
  first_name?: string;
  last_name?: string;
  email_address: string;
  votes_purchased: number;
  contest_entry_supported: string;
}

interface ActiveCampaignResponse {
  result_code: number;
  result_message: string;
  result_output: string;
}

/**
 * Send fan vote purchase data to ActiveCampaign
 */
export async function sendFanVotePurchaseToActiveCampaign(data: ActiveCampaignContactData): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = process.env.ACTIVECAMPAIGN_API_URL;
    const apiKey = process.env.ACTIVECAMPAIGN_API_KEY;
    const listId = process.env.ACTIVECAMPAIGN_LIST_ID; // The list ID for vote purchasers

    if (!apiUrl || !apiKey || !listId) {
      console.error('ActiveCampaign configuration missing:', {
        hasApiUrl: !!apiUrl,
        hasApiKey: !!apiKey,
        hasListId: !!listId
      });
      return { success: false, error: 'ActiveCampaign configuration missing' };
    }

    // Parse name if provided as single string
    let firstName = data.first_name || '';
    let lastName = data.last_name || '';
    
    // If no separate first/last names, try to split if it's a single string
    if (!firstName && !lastName && data.first_name) {
      const nameParts = data.first_name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Prepare the payload for ActiveCampaign
    const params = new URLSearchParams({
      api_action: 'contact_add',
      api_output: 'json'
    });

    const postData = new URLSearchParams({
      email: data.email_address,
      first_name: firstName,
      last_name: lastName,
      tags: 'fan-vote-purchaser,contest-supporter',
      // Custom fields for votes purchased and contest entry supported
      'field[%VOTES_PURCHASED%,0]': data.votes_purchased.toString(),
      'field[%CONTEST_ENTRY_SUPPORTED%,0]': data.contest_entry_supported,
      // Assign to the fan vote purchasers list
      [`p[${listId}]`]: listId,
      [`status[${listId}]`]: '1', // 1 = active
      [`instantresponders[${listId}]`]: '1' // Send instant autoresponders
    });

    // Log payload keys only (sanitized)
    const payloadKeys = Array.from(postData.keys());
    console.log('[ActiveCampaign] Payload keys (fan vote)', payloadKeys);

    const apiEndpoint = `${apiUrl}/admin/api.php?${params.toString()}`;

    console.log('[ActiveCampaign] Preparing request', {
      email: data.email_address,
      firstName,
      lastName,
      votes_purchased: data.votes_purchased,
      contest_entry_supported: data.contest_entry_supported,
      endpoint: `${apiUrl}/admin/api.php`,
      listId
    });

    console.time('[ActiveCampaign] contact_add request');

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'API-TOKEN': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData.toString()
    });

    const contentType = response.headers.get('content-type') || '';
    console.log('[ActiveCampaign] Response meta', {
      status: response.status,
      statusText: response.statusText,
      contentType
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[ActiveCampaign] Non-OK response body', errorBody);
      console.timeEnd('[ActiveCampaign] contact_add request');
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawText = await response.text();
    console.log('[ActiveCampaign] Raw response', rawText);

    let result: ActiveCampaignResponse;
    try {
      result = JSON.parse(rawText) as ActiveCampaignResponse;
    } catch (parseError) {
      console.timeEnd('[ActiveCampaign] contact_add request');
      console.error('[ActiveCampaign] Failed to parse JSON response', parseError);
      return { success: false, error: 'Invalid JSON response from ActiveCampaign' };
    }

    if (result.result_code === 1) {
      console.log('[ActiveCampaign] Success:', result.result_message);
      console.timeEnd('[ActiveCampaign] contact_add request');
      return { success: true };
    } else {
      console.error('[ActiveCampaign] API returned error:', result.result_message);
      console.timeEnd('[ActiveCampaign] contact_add request');
      return { success: false, error: result.result_message };
    }

  } catch (error) {
    console.error('[ActiveCampaign] Exception while sending fan vote purchase', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 

interface ActiveCampaignContestantData {
  first_name?: string;
  last_name?: string;
  email_address: string;
  entries_purchased: number;
  purchase_type: string;
  competition_name?: string;
  purchase_summary?: string;
}

/**
 * Send contestant purchase data (entries, add-ons) to ActiveCampaign
 */
export async function sendContestantPurchaseToActiveCampaign(data: ActiveCampaignContestantData): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = process.env.ACTIVECAMPAIGN_API_URL;
    const apiKey = process.env.ACTIVECAMPAIGN_API_KEY;
    const contestantListId = process.env.ACTIVECAMPAIGN_CONTESTANT_LIST_ID;

    if (!apiUrl || !apiKey || !contestantListId) {
      console.error('ActiveCampaign contestant configuration missing:', {
        hasApiUrl: !!apiUrl,
        hasApiKey: !!apiKey,
        hasContestantListId: !!contestantListId
      });
      return { success: false, error: 'ActiveCampaign contestant configuration missing' };
    }

    // Parse name if provided as single string
    let firstName = data.first_name || '';
    let lastName = data.last_name || '';

    if (!firstName && !lastName && data.first_name) {
      const nameParts = data.first_name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Prepare the payload for ActiveCampaign
    const params = new URLSearchParams({
      api_action: 'contact_add',
      api_output: 'json'
    });

    const postData = new URLSearchParams({
      email: data.email_address,
      first_name: firstName,
      last_name: lastName,
      tags: 'contestant-purchaser,contest-entry',
      // Custom fields (ensure these exist in AC or switch to numeric IDs)
      'field[%ENTRIES_PURCHASED%,0]': data.entries_purchased.toString(),
      'field[%PURCHASE_TYPE%,0]': data.purchase_type,
      'field[%COMPETITION_NAME%,0]': data.competition_name || '',
      'field[%PURCHASE_SUMMARY%,0]': (data.purchase_summary || '').slice(0, 255),
      // Assign to the contestants list
      [`p[${contestantListId}]`]: contestantListId,
      [`status[${contestantListId}]`]: '1',
      [`instantresponders[${contestantListId}]`]: '1'
    });

    // Log payload keys only (sanitized)
    const payloadKeys = Array.from(postData.keys());
    console.log('[ActiveCampaign][Contestant] Payload keys', payloadKeys);

    const apiEndpoint = `${apiUrl}/admin/api.php?${params.toString()}`;

    console.log('[ActiveCampaign][Contestant] Preparing request', {
      email: data.email_address,
      firstName,
      lastName,
      entries_purchased: data.entries_purchased,
      purchase_type: data.purchase_type,
      competition_name: data.competition_name,
      endpoint: `${apiUrl}/admin/api.php`,
      contestantListId
    });

    console.time('[ActiveCampaign][Contestant] contact_add request');

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'API-TOKEN': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData.toString()
    });

    const contentType = response.headers.get('content-type') || '';
    console.log('[ActiveCampaign][Contestant] Response meta', {
      status: response.status,
      statusText: response.statusText,
      contentType
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[ActiveCampaign][Contestant] Non-OK response body', errorBody);
      console.timeEnd('[ActiveCampaign][Contestant] contact_add request');
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawText = await response.text();
    console.log('[ActiveCampaign][Contestant] Raw response', rawText);

    let result: ActiveCampaignResponse;
    try {
      result = JSON.parse(rawText) as ActiveCampaignResponse;
    } catch (parseError) {
      console.timeEnd('[ActiveCampaign][Contestant] contact_add request');
      console.error('[ActiveCampaign][Contestant] Failed to parse JSON response', parseError);
      return { success: false, error: 'Invalid JSON response from ActiveCampaign' };
    }

    if (result.result_code === 1) {
      console.log('[ActiveCampaign][Contestant] Success:', result.result_message);
      console.timeEnd('[ActiveCampaign][Contestant] contact_add request');
      return { success: true };
    } else {
      console.error('[ActiveCampaign][Contestant] API returned error:', result.result_message);
      console.timeEnd('[ActiveCampaign][Contestant] contact_add request');
      return { success: false, error: result.result_message };
    }

  } catch (error) {
    console.error('[ActiveCampaign][Contestant] Exception while sending', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}