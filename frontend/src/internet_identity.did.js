// Minimal IDL for Internet Identity lookup method
export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'lookup': IDL.Func([IDL.Principal], [IDL.Opt(IDL.Nat64)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };

