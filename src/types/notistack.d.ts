declare module 'notistack' {
  export function useSnackbar(): {
    enqueueSnackbar(message: string, options?: any): void;
    closeSnackbar?(key?: any): void;
  };
} 