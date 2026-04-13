#1

1. In the left sidebar, click **Groups**
2. Click **Create group**
3. Enter a name, e.g., xbi-tasking-users
4. Click **Create**

#2
1. In the left sidebar, click **Users**
2. Click on a user (e.g., iauser)
3. Go to the Groups tab
4. Select **xbi-tasking-users** from the list
5. Click Join
6. Repeat for every user that should have access to your app 

#3
1. In the left sidebar, click Clients
2. Click on xbi-tasking-frontend
3. Go to the Client scopes tab
4. Click on xbi-tasking-frontend-dedicated (the dedicated scope for this client)
5. Click Configure a new mapper (or Add mapper > By configuration)
6. Select Group Membership from the list
7. Configure it:
    7.1 Name: groups (or any descriptive name)
    7.2 Token Claim Name: groups (this is the key that will appear in the JWT)
    7.3 Full group path: OFF (turning this off gives you clean group names like 
    7.4 xbi-tasking-users instead of /xbi-tasking-users)
    7.5 Add to ID token: ON
    7.6 Add to access token: ON
    7.7 Add to userinfo: ON
8. Click Save

#4 Verify if it works
1. In the left sidebar, click Clients > xbi-tasking-frontend
2. Go to the Client scopes tab
3. Click Evaluate (tab at the top)
4. Select a user (e.g., iauser) from the User dropdown
5. Click Generated access token
6. Look for the groups claim in the JSON