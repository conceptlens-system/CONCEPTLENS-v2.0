
import React, { useMemo, useCallback, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Edge,
    Node,
    Handle, // Added Handle
    useNodesState,
    useEdgesState,
    Position,
    MarkerType,
    ReactFlowProvider,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { AlertTriangle, Lightbulb, GraduationCap, BrainCircuit, Scan, Minimize, Maximize, ArrowRight, TrendingUp } from 'lucide-react';

// Layout settings
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 90;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, align: 'DL', nodesep: 60, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Shift dagre center-anchor to ReactFlow top-left anchor
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
        return node;
    });

    return { nodes, edges };
};

// --- Custom Node Components ---

const CustomConceptNode = ({ data }: any) => {
    const isDimmed = data.isDimmed;
    const level = data.level || 0; // 0=Root, 1=Unit, 2=Topic

    // Style variations based on hierarchy depth
    let bgStyle = "bg-white border-indigo-100";
    let iconStyle = "bg-indigo-50 text-indigo-600";

    if (level === 0) { // Root (Subject)
        bgStyle = "bg-indigo-900 border-indigo-700 text-white";
        iconStyle = "bg-indigo-800 text-indigo-200";
    } else if (level === 1) { // Unit
        bgStyle = "bg-indigo-50 border-indigo-200";
        iconStyle = "bg-white text-indigo-600 shadow-sm";
    }

    return (
        <div className={`border rounded-xl shadow-[0_4px_20px_-4px_rgba(99,102,241,0.1)] p-4 min-w-[220px] flex items-center gap-4 transition-all duration-300 ${bgStyle} ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100 scale-100'}`}>
            <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-indigo-400" />

            <div className={`p-2.5 rounded-lg shadow-sm ring-1 ring-inset ring-white/10 ${iconStyle}`}>
                <GraduationCap className="h-6 w-6" />
            </div>
            <div>
                <p className={`font-bold text-sm ${level === 0 ? 'text-white' : 'text-slate-800'}`}>{data.label}</p>
                <p className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${level === 0 ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {level === 0 ? "Subject" : level === 1 ? "Unit" : "Topic"}
                </p>
            </div>

            <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-indigo-400" />
        </div>
    );
};

const CustomFutureNode = ({ data }: any) => {
    const isDimmed = data.isDimmed;
    return (
        <div className={`bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 min-w-[200px] flex items-center gap-3 transition-all duration-300 ${isDimmed ? 'opacity-20' : 'opacity-80 hover:opacity-100 hover:border-indigo-300'}`}>
            <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400" />

            <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                <TrendingUp className="h-5 w-5" />
            </div>
            <div>
                <p className="font-semibold text-slate-600 text-sm">Future Risk: {data.label}</p>
                <p className="text-[10px] text-slate-400">Predicted Impact</p>
            </div>
        </div>
    )
}

const CustomRiskNode = ({ data }: any) => {
    const isHighRisk = data.riskLevel === 'high';
    const isDimmed = data.isDimmed;

    return (
        <div className={`group bg-white border-2 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] p-3 min-w-[240px] max-w-[280px] relative transition-all duration-300 cursor-pointer
            ${isDimmed ? 'opacity-20 blur-[1px]' : 'opacity-100 hover:scale-105 hover:shadow-xl hover:z-50'}
            ${isHighRisk ? 'border-rose-100 hover:border-rose-300 hover:ring-4 hover:ring-rose-50' : 'border-amber-100 hover:border-amber-300 hover:ring-4 hover:ring-amber-50'}
        `}>
            <Handle type="target" position={Position.Left} className={`w-3 h-3 !bg-slate-300 ${isHighRisk ? '!bg-rose-400' : '!bg-amber-400'}`} />

            {isHighRisk && (
                <div className="absolute -top-3 left-4 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-10 ring-2 ring-white">
                    <AlertTriangle className="h-3 w-3" /> Critical Gap
                </div>
            )}
            <div className="flex gap-3 items-start">
                <div className={`p-2.5 rounded-lg flex-shrink-0 h-fit mt-1 shadow-sm ${isHighRisk ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    <BrainCircuit className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <p className={`font-semibold text-sm line-clamp-2 leading-snug mb-2 ${isHighRisk ? 'text-slate-900' : 'text-slate-800'}`}>
                        {data.label}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 border-t pt-2 border-slate-50">
                        <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{data.students} Students</span>
                        <span className={`${isHighRisk ? 'text-rose-600 font-bold' : 'text-amber-600 font-medium'}`}>
                            {isHighRisk ? 'High Impact' : 'Medium Impact'}
                        </span>
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-slate-300" />
        </div>
    );
};

const nodeTypes = {
    concept: CustomConceptNode,
    risk: CustomRiskNode,
    future: CustomFutureNode
};

interface ConceptGraphProps {
    misconceptions: any[];
    onNodeClick: (node: any) => void;
}

function ConceptGraphInner({ misconceptions, onNodeClick }: ConceptGraphProps) {
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // 1. Transform Data
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        const nodes: any[] = [];
        const edges: any[] = [];
        const conceptMap = new Set<string>(); // Track unique concept IDs
        const edgeMap = new Set<string>(); // Track unique edges

        // Helper to add node if not exists
        const addNode = (id: string, label: string, type: 'concept' | 'future', level: number = 0) => {
            if (!conceptMap.has(id)) {
                conceptMap.add(id);
                nodes.push({
                    id,
                    type,
                    data: { label, level },
                    position: { x: 0, y: 0 }
                });
            }
        };

        // Helper to add edge if not exists
        const addEdge = (source: string, target: string, color = '#cbd5e1', dashed = false) => {
            const edgeId = `e-${source}-${target}`;
            if (!edgeMap.has(edgeId)) {
                edgeMap.add(edgeId);
                edges.push({
                    id: edgeId,
                    source,
                    target,
                    animated: true,
                    style: { stroke: color, strokeWidth: 2, strokeDasharray: dashed ? '5,5' : '0' },
                    type: 'default', // Bezier for tree
                });
            }
        };

        misconceptions.forEach((m, idx) => {
            // Parse hierarchy: Subject -> Unit -> Topic
            const chain = m.concept_chain && m.concept_chain.length > 0
                ? m.concept_chain
                : ["General Subject", "Topic"];

            let parentId = "";
            let currentPath: string[] = [];

            // Build Chain Nodes
            chain.forEach((conceptName: string, level: number) => {
                // Fix: Use accumulating path for ID to ensure unique nodes in the tree
                // e.g. "Math" -> "Math-Algebra" -> "Math-Algebra-Basics"
                currentPath.push(conceptName.replace(/\s+/g, '-'));
                const id = `c-${currentPath.join('__')}`;

                addNode(id, conceptName, 'concept', level);

                if (parentId) {
                    addEdge(parentId, id, '#6366f1'); // Blue connection for concepts
                }
                parentId = id;
            });

            // Add Misconception Node (Leaf)
            const mId = m.id || m._id || `m-${idx}`;
            // Lowered threshold to ensure high risk appears more often
            const isHighRisk = (m.student_count >= 3 || (m.confidence_score || 0) > 0.75);

            nodes.push({
                id: mId,
                type: 'risk',
                data: {
                    label: m.cluster_label || (m.reasoning ? m.reasoning.substring(0, 40) + "..." : "Issue"),
                    students: m.student_count,
                    riskLevel: isHighRisk ? 'high' : 'medium',
                    fullData: m
                },
                position: { x: 0, y: 0 },
            });

            // Connect Misconception to last parent (Topic)
            if (parentId) {
                addEdge(parentId, mId, isHighRisk ? '#f43f5e' : '#f59e0b');
            }

            // --- Mock Predictive "Future" Node ---
            // Always show at least one predictor for demonstration to highlight the feature
            const futureTopics = {
                "Physics": ["Dynamics", "Fluid Mechanics"],
                "Math": ["Calculus II", "Differential Eq"],
                "Chemistry": ["Organic Synthesis", "Kinetics"],
                "Computer Science": ["Advanced Data Structures", "System Design"],
                "Database Systems": ["Query Optimization", "Distributed DBs"]
            };

            // Simple deterministic mock based on Root Subject or fallback
            const rootSubject = chain[0] || "General";
            const possibleFutures = futureTopics[rootSubject as keyof typeof futureTopics] || ["Advanced Concepts", "Synthesizing Applications"];
            const predicted = possibleFutures[idx % possibleFutures.length];
            const futureId = `f-${mId}-${predicted.replace(/\s+/g, '-')}`;

            addNode(futureId, predicted, 'future');
            addEdge(mId, futureId, '#94a3b8', true); // Grey dashed line
        });

        // Use 'LR' (Left-to-Right) layout for tree
        return getLayoutedElements(nodes, edges, 'LR');
    }, [misconceptions]);

    // Graph State
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Initial Layout Update
    React.useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);


    // --- Interactivity: Dimming ---
    // Make non-connected nodes translucent when hovering a node
    const displayedNodes = useMemo(() => {
        if (!hoveredNodeId) return nodes;

        // Find connected nodes (bfs/traversal)
        // For simplicity, just immediate neighbors for now
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(hoveredNodeId);

        edges.forEach(edge => {
            if (edge.source === hoveredNodeId) connectedNodeIds.add(edge.target);
            if (edge.target === hoveredNodeId) connectedNodeIds.add(edge.source);
        });

        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                isDimmed: !connectedNodeIds.has(node.id)
            }
        }));
    }, [nodes, edges, hoveredNodeId]);


    const displayedEdges = useMemo(() => {
        if (!hoveredNodeId) return edges;

        return edges.map(edge => ({
            ...edge,
            style: {
                ...edge.style,
                opacity: (edge.source === hoveredNodeId || edge.target === hoveredNodeId) ? 1 : 0.1,
                strokeWidth: (edge.source === hoveredNodeId || edge.target === hoveredNodeId) ? 3 : 1
            },
            animated: (edge.source === hoveredNodeId || edge.target === hoveredNodeId)
        }));
    }, [edges, hoveredNodeId]);


    return (
        <div className="h-[650px] w-full bg-slate-50/50 rounded-2xl border border-slate-200 shadow-inner overflow-hidden relative group">
            <ReactFlow
                nodes={displayedNodes}
                edges={displayedEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(e, node) => node.data.fullData && onNodeClick(node.data.fullData)}
                onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
                onNodeMouseLeave={() => setHoveredNodeId(null)}
                nodeTypes={nodeTypes}
                fitView
                // Enable standard interactions
                nodesDraggable={true}
                nodesConnectable={false}
                zoomOnScroll={true}
                panOnScroll={true}
                className="bg-slate-50/50"
                minZoom={0.2}
                maxZoom={2}
            >
                <Background color="#94a3b8" gap={24} size={1} className="opacity-20" />

                {/* Controls repositioned to Top-Right to avoid clash */}
                <Controls position="top-right" className="bg-white border shadow-sm !m-4 text-slate-600" />

                {/* MiniMap repositioned to Bottom-Right */}
                <MiniMap
                    position="bottom-right"
                    nodeStrokeColor="transparent"
                    nodeColor={(n) => {
                        if (n.type === 'concept') return '#6366f1';
                        if (n.type === 'risk') return '#f43f5e';
                        if (n.type === 'future') return '#94a3b8';
                        return '#e2e8f0';
                    }}
                    className="border shadow-lg rounded-xl overflow-hidden !m-6 !w-[160px] !h-[100px] bg-white ring-4 ring-slate-100"
                />

                {/* Custom Legend / Title Overlay (Bottom Left) */}
                <Panel position="bottom-left" className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border shadow-lg m-6 w-[280px]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                            <BrainCircuit className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Concept Ecosystem</h4>
                            <p className="text-[10px] text-slate-500">Visualizing learning gaps & blockers</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-xs">
                            <span className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-indigo-100"></span>
                            <span className="text-slate-600">Root Subject</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="w-3 h-3 rounded-full border border-indigo-200 bg-white shadow-sm"></span>
                            <span className="text-slate-600">Unit / Topic</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-100"></span>
                            <span className="text-slate-600">Critical Misconception</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="w-3 h-3 rounded border border-dashed border-slate-400 bg-slate-50"></span>
                            <span className="text-slate-600">Predicted Future Risk</span>
                        </div>
                    </div>
                </Panel>

            </ReactFlow>
        </div>
    );
}

// Wrap with Provider to ensure context exists
export function ConceptGraph(props: ConceptGraphProps) {
    return (
        <ReactFlowProvider>
            <ConceptGraphInner {...props} />
        </ReactFlowProvider>
    );
}
