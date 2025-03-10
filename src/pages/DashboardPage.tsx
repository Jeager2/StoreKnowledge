import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Badge,
  Divider,
  Button,
  Flex,
} from '@chakra-ui/react';
import { FiFileText, FiFolder, FiList, FiBook, FiFilm, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Types
interface FileStats {
  totalFiles: number;
  totalFolders: number;
  markdownFiles: number;
  pdfFiles: number;
  imageFiles: number;
  recentFiles: Array<{
    name: string;
    path: string;
    modified: string;
  }>;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
}

const DashboardPage: React.FC = () => {
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const statBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch file statistics
        const fileResponse = await axios.get(`${API_URL}/files/stats`);
        setFileStats(fileResponse.data);

        // Fetch task statistics
        const taskResponse = await axios.get(`${API_URL}/markdown/tasks/stats`);
        setTaskStats(taskResponse.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleFileOpen = (path: string) => {
    navigate(`/editor/${encodeURIComponent(path)}`);
  };

  if (isLoading) {
    return (
      <Box p={8} textAlign="center">
        <Text fontSize="lg">Loading dashboard...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8} textAlign="center">
        <Text color="red.500" fontSize="lg">{error}</Text>
        <Button
          mt={4}
          colorScheme="blue"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>Dashboard</Heading>

      {/* File Statistics */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Card bg={cardBg} shadow="md">
          <CardHeader pb={0}>
            <HStack>
              <Icon as={FiFileText} boxSize={6} color="blue.500" />
              <Heading size="md">Files</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Stat bg={statBg} p={3} borderRadius="md">
              <StatLabel>Total Documents</StatLabel>
              <StatNumber>{fileStats?.totalFiles || 0}</StatNumber>
              <StatHelpText>
                {fileStats?.markdownFiles || 0} Markdown Files
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} shadow="md">
          <CardHeader pb={0}>
            <HStack>
              <Icon as={FiFolder} boxSize={6} color="green.500" />
              <Heading size="md">Folders</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Stat bg={statBg} p={3} borderRadius="md">
              <StatLabel>Organized Content</StatLabel>
              <StatNumber>{fileStats?.totalFolders || 0}</StatNumber>
              <StatHelpText>
                Project Folders
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} shadow="md">
          <CardHeader pb={0}>
            <HStack>
              <Icon as={FiList} boxSize={6} color="purple.500" />
              <Heading size="md">Tasks</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Stat bg={statBg} p={3} borderRadius="md">
              <StatLabel>Task Tracking</StatLabel>
              <StatNumber>{taskStats?.total || 0}</StatNumber>
              <StatHelpText>
                {taskStats?.completed || 0} Completed | {taskStats?.pending || 0} Pending
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Recent Files */}
      <Card bg={cardBg} shadow="md" mb={8}>
        <CardHeader>
          <HStack>
            <Icon as={FiClock} boxSize={6} color="orange.500" />
            <Heading size="md">Recent Files</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={3}>
            {fileStats?.recentFiles?.length ? (
              fileStats.recentFiles.map((file, index) => (
                <React.Fragment key={file.path}>
                  {index > 0 && <Divider />}
                  <HStack justify="space-between">
                    <HStack spacing={3}>
                      <Icon
                        as={file.path.endsWith('.md') ? FiFileText :
                            file.path.endsWith('.pdf') ? FiFileText : FiFileText}
                        color={file.path.endsWith('.md') ? 'blue.500' :
                               file.path.endsWith('.pdf') ? 'red.500' : 'gray.500'}
                      />
                      <Text
                        fontWeight="medium"
                        cursor="pointer"
                        _hover={{ color: 'blue.500' }}
                        onClick={() => handleFileOpen(file.path)}
                      >
                        {file.name}
                      </Text>
                    </HStack>
                    <HStack>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(file.modified).toLocaleDateString()}
                      </Text>
                      {file.path.endsWith('.md') && <Badge colorScheme="blue">Markdown</Badge>}
                      {file.path.endsWith('.pdf') && <Badge colorScheme="red">PDF</Badge>}
                    </HStack>
                  </HStack>
                </React.Fragment>
              ))
            ) : (
              <Text textAlign="center" color="gray.500">No recent files found</Text>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Special Content Types */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Card bg={cardBg} shadow="md">
          <CardHeader pb={0}>
            <HStack>
              <Icon as={FiBook} boxSize={6} color="blue.500" />
              <Heading size="md">Book Collection</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Flex direction="column" align="center" justify="center" p={4}>
              <Text mb={4}>View and manage your book collection with DataView</Text>
              <Button
                colorScheme="blue"
                leftIcon={<FiBook />}
                onClick={() => navigate('/dataview/books')}
              >
                Open Books
              </Button>
            </Flex>
          </CardBody>
        </Card>

        <Card bg={cardBg} shadow="md">
          <CardHeader pb={0}>
            <HStack>
              <Icon as={FiFilm} boxSize={6} color="red.500" />
              <Heading size="md">Movie Collection</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Flex direction="column" align="center" justify="center" p={4}>
              <Text mb={4}>View and manage your movie collection with DataView</Text>
              <Button
                colorScheme="red"
                leftIcon={<FiFilm />}
                onClick={() => navigate('/dataview/movies')}
              >
                Open Movies
              </Button>
            </Flex>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default DashboardPage;