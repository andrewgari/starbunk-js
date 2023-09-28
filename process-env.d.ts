declare global {
    namespace NodeJS {
        interface ProcessEnv {
            [key: string]: string | undefined;
            STARBUNK_TOKEN: string;
            SNOWBUNK_TOKEN: string;
        }
    }
}
