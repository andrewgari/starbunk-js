declare global {
    namespace NodeJS {
        interface ProcessEnv {
            STARBUNK_TOKEN: string;
            SNOWBUNK_TOKEN: string;
        }
    }
}


export {}
