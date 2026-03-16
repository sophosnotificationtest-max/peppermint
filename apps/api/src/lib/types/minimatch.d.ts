declare module 'minimatch' {
  export function minimatch(path: string, pattern: string, options?: any): boolean;
  export default minimatch;
}
