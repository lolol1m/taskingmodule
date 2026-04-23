docker run --rm `
>>   -v /var/run/docker.sock:/var/run/docker.sock `
>>   -v ${PWD}:/work `
>>   aquasec/trivy image tm_v3-keycloak:latest `
>>   --format template `
>>   --template "@/work/toml.tpl" `
>>   -o /work/kc.toml

docker run --rm `
>>   -v /var/run/docker.sock:/var/run/docker.sock `
>>   -v ${PWD}:/work `
>>   aquasec/trivy image tm_v3-keycloak:latest `
>>   --format json
>>   -o /work/kc.json


## Fixing package vulnerabilities

npm audit --fix

pip install pip-audit
pip-audit --fix