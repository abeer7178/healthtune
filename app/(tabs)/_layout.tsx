import FontAwesome from '@expo/vector-icons/FontAwesome';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Tabs } from 'expo-router';
import { ThemeToggle } from '~/src/components/ThemeToggle';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#2D796C' ,headerShown: false}}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }: { color: string }) => <FontAwesome size={28} name="home" color={color} />,
                    headerRight: () => <ThemeToggle />,
                }}
            />
            <Tabs.Screen
                name="sessions"
                options={{
                    title: 'Sessions',
                    tabBarIcon: ({ color }: { color: string }) => <MaterialCommunityIcons name="text-to-speech" size={28} color={color} />,
                    headerShown:false
                }}
            />
              <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }: { color: string }) => <FontAwesome size={28} name="user" color={color} />,
                    headerRight: () => <ThemeToggle />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }: { color: string }) => <FontAwesome size={28} name="cog" color={color} />,
                    headerRight: () => <ThemeToggle />,
                }}
            />
          
        </Tabs>
    );
}
