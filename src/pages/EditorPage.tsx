import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  ButtonGroup,
  Button,
  IconButton,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorMode,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tooltip,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  HStack,
  Spinner,
} from '@chakra-ui/react';
import {
  FiEye,
  FiEdit,
  FiCode,
  FiSave,
  FiMoreVertical,
  FiDownload,
  FiUpload,
  FiTrash2,
  FiChevronRight
} from 'react-icons/fi';
import fileService from '../services/fileService';
import Editor from '../components/Editor';
import Reader from '../components/Reader';
import ContextMenu from '../components/ContextMenu';

interface EditorPageProps {}

const EditorPage: React.FC<EditorPageProps> = () => {
  const { filePath } = useParams<{ filePath: string }>();
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'read' | 'source'>('edit');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const contextMenuRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { colorMode } = useColorMode();
  const {
    isOpen: isDeleteDialogOpen,
    onOpen: onDeleteDialogOpen,
    onClose: onDeleteDialogClose
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!filePath) return;

    const fetchFileContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const decodedPath = decodeURIComponent(filePath);
        const fileContent = await fileService.getFileContent(decodedPath);
        setContent(fileContent.content);
        setOriginalContent(fileContent.content);
      } catch (err) {
        console.error('Error fetching file content:', err);
        setError('Failed to load file content. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileContent();
  }, [filePath]);

  // Detect unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(content !== originalContent);
  }, [content, originalContent]);

  // Prompt before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleSave = async () => {
    if (!filePath) return;

    try {
      const decodedPath = decodeURIComponent(filePath);
      await fileService.updateFile(decodedPath, content);
      setOriginalContent(content);
      toast({
        title: 'File saved',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error saving file:', err);
      toast({
        title: 'Error saving file',
        description: 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleExportToPDF = async () => {
    if (!filePath) return;

    try {
      const decodedPath = decodeURIComponent(filePath);
      // This would typically be changed to a more appropriate endpoint
      window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/pdf/export?path=${encodeURIComponent(decodedPath)}`, '_blank');
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      toast({
        title: 'Error exporting to PDF',
        description: 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteFile = async () => {
    if (!filePath) return;

    try {
      const decodedPath = decodeURIComponent(filePath);
      await fileService.deleteFile(decodedPath);
      toast({
        title: 'File deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate back to the parent directory
      const pathParts = decodedPath.split('/');
      pathParts.pop();
      const parentPath = pathParts.join('/');
      navigate(`/files/${encodeURIComponent(parentPath || '/')}`);
    } catch (err) {
      console.error('Error deleting file:', err);
      toast({
        title: 'Error deleting file',
        description: 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onDeleteDialogClose();
    }
  };

  // Generate breadcrumb items from file path
  const generateBreadcrumbs = () => {
    if (!filePath) return [];

    const decodedPath = decodeURIComponent(filePath);
    const pathParts = decodedPath.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Root item
    breadcrumbs.push({
      name: 'Root',
      path: '/',
    });

    // Path parts
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += `/${pathParts[i]}`;
      breadcrumbs.push({
        name: pathParts[i],
        path: currentPath,
      });
    }

    // Current file (last item)
    if (pathParts.length > 0) {
      breadcrumbs.push({
        name: pathParts[pathParts.length - 1],
        path: decodedPath,
        isCurrent: true,
      });
    }

    return breadcrumbs;
  };

  // Render breadcrumbs navigation
  const renderBreadcrumbs = () => {
    const breadcrumbs = generateBreadcrumbs();

    return (
      <Breadcrumb
        spacing="8px"
        separator={<FiChevronRight color="gray.500" />}
        mb={4}
      >
        {breadcrumbs.map((crumb, index) => (
          <BreadcrumbItem key={index} isCurrentPage={crumb.isCurrent}>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (!crumb.isCurrent) {
                  navigate(`/files/${encodeURIComponent(crumb.path)}`);
                }
              }}
              fontWeight={crumb.isCurrent ? 'bold' : 'normal'}
              color={crumb.isCurrent ? 'blue.500' : undefined}
            >
              {crumb.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
        ))}
      </Breadcrumb>
    );
  };

  if (isLoading) {
    return (
      <Flex
        height="100%"
        width="100%"
        alignItems="center"
        justifyContent="center"
        direction="column"
        p={8}
      >
        <Spinner size="xl" mb={4} />
        <Text>Loading file...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex
        height="100%"
        width="100%"
        alignItems="center"
        justifyContent="center"
        direction="column"
        p={8}
      >
        <Text color="red.500" fontSize="lg" mb={4}>{error}</Text>
        <Button
          colorScheme="blue"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </Flex>
    );
  }

  return (
    <Box height="100%">
      {/* Breadcrumbs navigation */}
      {renderBreadcrumbs()}

      {/* Toolbar */}
      <Flex
        mb={4}
        justifyContent="space-between"
        alignItems="center"
        bg={colorMode === 'dark' ? 'gray.700' : 'white'}
        p={2}
        borderRadius="md"
        shadow="sm"
      >
        <ButtonGroup isAttached variant="outline" size="sm">
          <Tooltip label="WYSIWYG Editor">
            <IconButton
              aria-label="WYSIWYG Editor"
              icon={<FiEdit />}
              onClick={() => setViewMode('edit')}
              colorScheme={viewMode === 'edit' ? 'blue' : undefined}
              variant={viewMode === 'edit' ? 'solid' : 'outline'}
            />
          </Tooltip>
          <Tooltip label="Preview Mode">
            <IconButton
              aria-label="Preview Mode"
              icon={<FiEye />}
              onClick={() => setViewMode('read')}
              colorScheme={viewMode === 'read' ? 'blue' : undefined}
              variant={viewMode === 'read' ? 'solid' : 'outline'}
            />
          </Tooltip>
          <Tooltip label="Source Mode">
            <IconButton
              aria-label="Source Mode"
              icon={<FiCode />}
              onClick={() => setViewMode('source')}
              colorScheme={viewMode === 'source' ? 'blue' : undefined}
              variant={viewMode === 'source' ? 'solid' : 'outline'}
            />
          </Tooltip>
        </ButtonGroup>

        <HStack>
          <Button
            leftIcon={<FiSave />}
            colorScheme="blue"
            size="sm"
            onClick={handleSave}
            isDisabled={!hasUnsavedChanges}
          >
            Save
          </Button>

          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="More options"
              icon={<FiMoreVertical />}
              variant="ghost"
              size="sm"
            />
            <MenuList>
              <MenuItem icon={<FiDownload />} onClick={handleExportToPDF}>
                Export to PDF
              </MenuItem>
              <MenuItem icon={<FiTrash2 />} color="red.500" onClick={onDeleteDialogOpen}>
                Delete File
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Editor Panels */}
      <Box
        h="calc(100% - 100px)"
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
        bg={colorMode === 'dark' ? 'gray.700' : 'white'}
      >
        {viewMode === 'edit' && (
          <Editor
            content={content}
            onChange={handleContentChange}
            contextMenuRef={contextMenuRef}
          />
        )}

        {viewMode === 'read' && (
          <Reader content={content} />
        )}

        {viewMode === 'source' && (
          <Editor
            content={content}
            onChange={handleContentChange}
            sourceMode={true}
          />
        )}
      </Box>

      {/* Context Menu for text selection */}
      <ContextMenu ref={contextMenuRef} onAction={(action, selection) => {
        // Handle context menu actions
        // This would be implemented to insert markdown formatting
      }} />

      {/* Delete File Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteDialogClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete File
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteDialogClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteFile} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default EditorPage;