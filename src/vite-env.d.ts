/// <reference types="vite/client" />

declare module '*?raw' {
  const content: string;
  export default content;
}

interface GoogleScriptRun {
  withSuccessHandler: (callback: (result: any) => void) => GoogleScriptRun;
  withFailureHandler: (callback: (error: Error) => void) => GoogleScriptRun;
  [fnName: string]: (...args: any[]) => void;
}

interface Window {
  google?: {
    script?: {
      run?: GoogleScriptRun;
    };
  };
}
