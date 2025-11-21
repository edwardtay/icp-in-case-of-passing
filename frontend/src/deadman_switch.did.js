// This file will be generated from the Candid file
// For now, we'll create a basic IDL factory
export const idlFactory = ({ IDL }) => {
  const RegisterArgs = IDL.Record({
    'timeout_duration_seconds' : IDL.Nat64,
    'beneficiary' : IDL.Principal,
  });
  const HeartbeatResponse = IDL.Record({
    'success' : IDL.Bool,
    'message' : IDL.Text,
    'next_heartbeat_due' : IDL.Nat64,
  });
  const UserAccount = IDL.Record({
    'principal' : IDL.Principal,
    'last_heartbeat' : IDL.Nat64,
    'timeout_duration_seconds' : IDL.Nat64,
    'beneficiary' : IDL.Principal,
    'balance' : IDL.Nat64,
  });
  return IDL.Service({
    'get_account_info' : IDL.Func([], [IDL.Variant({ 'ok' : UserAccount, 'err' : IDL.Text })], ['query']),
    'get_ckbtc_balance' : IDL.Func([], [IDL.Variant({ 'ok' : IDL.Nat64, 'err' : IDL.Text })], []),
    'get_user_balance' : IDL.Func([], [IDL.Variant({ 'ok' : IDL.Nat64, 'err' : IDL.Text })], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'heartbeat' : IDL.Func([], [IDL.Variant({ 'ok' : HeartbeatResponse, 'err' : IDL.Text })], []),
    'list_users' : IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, UserAccount))], ['query']),
    'register' : IDL.Func([RegisterArgs], [IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text })], []),
    'deposit' : IDL.Func([IDL.Nat64], [IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text })], []),
  });
};

