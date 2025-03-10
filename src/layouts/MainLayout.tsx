import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Flex,
  IconButton,
  useColorMode,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Spacer,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { HamburgerIcon, MoonIcon, SunIcon, SettingsIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Import your LeftNav component
import LeftNav from '../components/LeftNav';

const MainLayout: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState(false);

  // Responsive adjustments
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const leftNavWidth = isLeftNavCollapsed ? '60px' : '250px';

  // Handle navigation
  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktop) {
      onClose();
    }
  };

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Left Navigation - Visible on desktop, in drawer on mobile */}
      {isDesktop ? (
        <Box
          w={leftNavWidth}
          h="100vh"
          bg={colorMode === 'dark' ? 'gray.900' : 'white'}
          borderRight="1px"
          borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
          transition="width 0.2s"
          overflow="hidden"
        >
          <LeftNav
            isCollapsed={isLeftNavCollapsed}
            onToggleCollapse={() => setIsLeftNavCollapsed(!isLeftNavCollapsed)}
          />
        </Box>
      ) : (
        <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader borderBottomWidth="1px">Navigation</DrawerHeader>
            <DrawerBody p={0}>
              <LeftNav
                isCollapsed={false}
                onToggleCollapse={() => {}}
                onItemClick={onClose}
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      )}

      {/* Main Content Area */}
      <Flex direction="column" flex="1" overflow="hidden">
        {/* Top Header */}
        <Flex
          as="header"
          align="center"
          justify="space-between"
          p={4}
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          borderBottom="1px"
          borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
        >
          {/* Left side of header */}
          <HStack>
            {!isDesktop && (
              <IconButton
                aria-label="Open Navigation"
                icon={<HamburgerIcon />}
                onClick={onOpen}
                variant="ghost"
              />
            )}
          </HStack>

          <Spacer />

          {/* Right side of header */}
          <HStack spacing={4}>
            <IconButton
              aria-label={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
              onClick={toggleColorMode}
              variant="ghost"
            />

            <Menu>
              <MenuButton>
                <HStack>
                  <Avatar size="sm" name={user?.full_name || user?.username} />
                  {isDesktop && <Text>{user?.username}</Text>}
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<SettingsIcon />} onClick={() => handleNavigate('/settings')}>
                  Settings
                </MenuItem>
                {user?.username === 'admin' && (
                  <MenuItem onClick={() => handleNavigate('/users')}>
                    User Management
                  </MenuItem>
                )}
                <MenuItem onClick={logout}>
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>

        {/* Main Content */}
        <Box flex="1" p={4} overflow="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MainLayout;