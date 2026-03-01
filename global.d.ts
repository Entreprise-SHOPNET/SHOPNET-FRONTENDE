

export {};

declare global {
  var currentUser: {
    id: number;
    [key: string]: any;
  } | undefined;
}
