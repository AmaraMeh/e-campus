import { Text, TextProps } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import Colors from '../constants/Colors';

export default function CustomText({ style, ...props }: TextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Text
      style={[
        {
          fontFamily: 'Poppins-Regular',
          color: colors.text,
        },
        style,
      ]}
      {...props}
    />
  );
}