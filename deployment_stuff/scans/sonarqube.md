### How to scan with Sonarqube

## Setting up sonarqube (docker)

Running docker container:
```
$ docker run -d --name sonarqube -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true -p 9000:9000 sonarqube:latest
```

1. User: admin
password: admin

2. Sonarqube will prompt you to change your password (remember it as it will be used by you)

## Starting a project to scan locally
In order to scan locally, a project has to be added

1. In /projects page, `Create Project` -> `Local Project`
2. Add the project display name (project key is the same as display name by default)
3. Click `Next`
4. Follow the instance's default (`Previous Version`)
5. Click `Locally`
6. Generate a project token with `Generate` (the token is needed when scanning)
7. Click `Continue`

## Scan for backend (python)
In xbi_tasking_backend:
```
venv/scripts/activate
```
```
pip install pysonar
```

```
pysonar `
>>   --sonar-host-url="http://localhost:9000" `
>>   --sonar-token="mytoken" `
>>   --sonar-project-key="tangy"
```

-----------------------

## Scan for frontend (TS / JS)
In xbi_tasking_frontend:
```
npm install -g @sonar/scan
```
Run this instead for powershell:'
```
sonar-scanner `
>>   "-Dsonar.host.url=http://localhost:9000" `
>>   "-Dsonar.token=mytoken" `
>>   "-Dsonar.projectKey=frontend-tm"
```

.scannerwork folder should be created in frontend root directory
with .sonar_lock and report-task.txt