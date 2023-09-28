import { cleanEnv, str } from 'envalid'

const env = cleanEnv(process.env, {
    STARBUNK_TOKEN: str(),
    SNOWBUNK_TOKEN: str()
});

export default env;