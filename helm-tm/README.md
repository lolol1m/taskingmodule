# How to convert docker compose to helm deployment

## Using kompose to generate rudimentayr helm chart 

Remove annotations field

Replace "io.kompose.service" with app for readability


Run notepad as administrator, edit system32/drivers/etc/hosts as "All Files" and add:
```
1.2.3.4 tangy.local
1.2.3.4 tangy.auth.local
```