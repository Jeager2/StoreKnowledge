import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  useColorMode,
  IconButton,
  HStack,
  Spacer,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { user, login, isLoading, error } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
      p={4}
    >
      <Box position="absolute" top={4} right={4}>
        <IconButton
          aria-label={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
          onClick={toggleColorMode}
          variant="ghost"
        />
      </Box>

      <Card
        maxW="md"
        w="full"
        shadow="lg"
        borderRadius="lg"
        bg={colorMode === 'dark' ? 'gray.700' : 'white'}
      >
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Box textAlign="center">
              <Heading size="lg" mb={2}>Markdown Web Editor</Heading>
              <Text color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                Sign in to your account
              </Text>
            </Box>

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Username</FormLabel>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </FormControl>

                <HStack w="full">
                  <Spacer />
                  <Button
                    colorScheme="blue"
                    type="submit"
                    isLoading={isLoading}
                    loadingText="Signing In"
                    size="md"
                  >
                    Sign In
                  </Button>
                </HStack>
              </VStack>
            </form>

            <Text fontSize="sm" textAlign="center" color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}>
              Default admin credentials: admin / admin
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default LoginPage;