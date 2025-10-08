# ActiveCampaign Integration Setup

This document outlines the setup required for the ActiveCampaign webhook integration that fires when fans purchase votes.

## Environment Variables Required

Add the following environment variables to your `.env.local` file:

```env
# ActiveCampaign API Configuration
ACTIVECAMPAIGN_API_URL=https://americansongwriter.api-us1.com
ACTIVECAMPAIGN_API_KEY=your_api_key_here
ACTIVECAMPAIGN_LIST_ID=your_list_id_for_fan_vote_purchasers
```

## How to Get These Values

### 1. API URL
- Already provided: `https://americansongwriter.api-us1.com`

### 2. API Key
- Log in to your ActiveCampaign account
- Go to Settings → Developer
- Copy your API Key

### 3. List ID
- Go to Contacts → Lists
- Find or create a list for "Fan Vote Purchasers"
- The list ID will be in the URL when viewing the list

## Custom Fields Required

You'll need to create these custom fields in ActiveCampaign:

1. **VOTES_PURCHASED** - Number field to track how many votes were purchased
2. **CONTEST_ENTRY_SUPPORTED** - Text field to track which artist/song was supported

### Creating Custom Fields:
1. Go to Contacts → Manage Fields
2. Click "Add a Field"
3. Create the fields with the exact names above
4. Note the personalization tags (e.g., `%VOTES_PURCHASED%`)

## What Data is Sent

When a fan successfully purchases votes, the following data is sent to ActiveCampaign:

- **first_name**: Fan's first name
- **last_name**: Fan's last name  
- **email_address**: Fan's email address
- **votes_purchased**: Number of votes purchased
- **contest_entry_supported**: Artist name and song title (e.g., "Song Title by Artist Name")
- **tags**: Automatically tagged as "fan-vote-purchaser" and "contest-supporter"

## Integration Points

The webhook fires from:
- `src/app/api/webhook/vote/route.ts` - When Stripe payment for votes succeeds
- `src/lib/activecampaign.ts` - Contains the integration logic

## Testing

1. Make sure all environment variables are set
2. Process a test vote purchase
3. Check ActiveCampaign contacts to verify the data was received
4. Monitor server logs for any integration errors

## Error Handling

- If ActiveCampaign is down or returns an error, the webhook will continue processing
- Errors are logged but don't fail the entire payment process
- This ensures payment completion isn't affected by marketing integrations 