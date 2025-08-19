


// DebugText.tsx
import React from 'react';
import { Text } from 'react-native';

export default function DebugText({ children }) {
  if (
    children === null ||
    children === undefined ||
    typeof children === 'boolean'
  ) {
    return null;
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return <Text>{children}</Text>;
  }

  if (typeof children === 'object') {
    return <Text>{JSON.stringify(children)}</Text>;
  }

  return <Text>{String(children)}</Text>;
}
