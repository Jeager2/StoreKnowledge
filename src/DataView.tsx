import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DataViewProps {
  filePath: string;
  content: string;
}

interface DataviewQuery {
  type: string;
  source: string;
  id: string;
}

interface DataviewResult {
  id: string;
  columns: string[];
  data: any[][];
  error?: string;
}

const DataView: React.FC<DataViewProps> = ({ filePath, content }) => {
  const [queries, setQueries] = useState<DataviewQuery[]>([]);
  const [results, setResults] = useState<Record<string, DataviewResult>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract dataview queries from content
    extractQueries();
  }, [content]);

  useEffect(() => {
    // Execute queries when they change
    if (queries.length > 0) {
      executeQueries();
    }
  }, [queries]);

  const extractQueries = () => {
    // Regular expression to match dataview blocks
    const dataviewRegex = /```dataview\s+([\s\S]*?)```/g;
    const tableRegex = /TABLE\s+(.*?)(?:\s+FROM\s+(.*?))?(?:\s+WHERE\s+(.*?))?(?:\s+SORT\s+(.*?))?(?:\s+LIMIT\s+(.*?))?$/gm;

    let match;
    const extractedQueries: DataviewQuery[] = [];

    while ((match = dataviewRegex.exec(content)) !== null) {
      const queryContent = match[1];
      const id = `query-${extractedQueries.length}`;

      if (queryContent.includes('TABLE')) {
        extractedQueries.push({
          type: 'table',
          source: queryContent,
          id
        });
      } else if (queryContent.includes('LIST')) {
        extractedQueries.push({
          type: 'list',
          source: queryContent,
          id
        });
      }
    }

    setQueries(extractedQueries);
  };

  const executeQueries = async () => {
    setLoading(true);
    try {
      const queryResults: Record<string, DataviewResult> = {};

      for (const query of queries) {
        try {
          const response = await axios.post('/api/dataview/execute', {
            query: query.source,
            filePath,
            contextPath: filePath
          });

          queryResults[query.id] = {
            id: query.id,
            columns: response.data.columns || [],
            data: response.data.data || []
          };
        } catch (err: any) {
          console.error(`Error executing query ${query.id}:`, err);
          queryResults[query.id] = {
            id: query.id,
            columns: [],
            data: [],
            error: err.response?.data?.error || 'Failed to execute query'
          };
        }
      }

      setResults(queryResults);
      setError(null);
    } catch (err) {
      console.error('Error processing dataview queries:', err);
      setError('Failed to process dataview queries');
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (result: DataviewResult) => {
    if (result.error) {
      return <div className="text-red-500 my-2">{result.error}</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {result.columns.map((column, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {result.data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (queries.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        No dataview queries found in this document.
        <p className="mt-2 text-sm">
          Add a dataview query using the ```dataview syntax. For example:
        </p>
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {`\`\`\`dataview
TABLE file.ctime as "Created", file.mtime as "Modified"
FROM "notes"
SORT file.mtime DESC
\`\`\``}
        </pre>
      </div>
    );
  }

  return (
    <div className="dataview-container">
      <h2 className="text-xl font-semibold mb-4">Data Views</h2>

      {loading && <div className="text-gray-500 mb-4">Processing queries...</div>}

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {queries.map((query) => (
        <div key={query.id} className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="font-medium mb-2">Query</h3>
          <pre className="bg-gray-100 p-2 rounded mb-4 text-sm">{query.source}</pre>

          <h3 className="font-medium mb-2">Result</h3>
          {results[query.id] ? (
            renderTable(results[query.id])
          ) : (
            <div className="text-gray-500">Loading result...</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DataView;