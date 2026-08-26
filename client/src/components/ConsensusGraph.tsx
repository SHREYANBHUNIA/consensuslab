import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { Link, SimMessage, SimNode } from "../../../shared/simulation";

type ConsensusGraphProps = {
  nodes: SimNode[];
  links: Link[];
  messages: SimMessage[];
  onToggleLink: (source: string, target: string) => void;
};

const pointFor = (id: string) => {
  if (id === "node-a") return { x: 420, y: 92 };
  if (id === "node-b") return { x: 182, y: 315 };
  return { x: 658, y: 315 };
};

const roleColor = (role: SimNode["role"]) => ({
  leader: "#705f99",
  follower: "#5d9f91",
  candidate: "#b4758f",
  offline: "#9d8eaa",
}[role]);

export function ConsensusGraph({ nodes, links, messages, onToggleLink }: ConsensusGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    const svg = d3.select(root);
    svg.selectAll("*").remove();
    svg.attr("viewBox", "0 0 840 410").attr("preserveAspectRatio", "xMidYMid meet");

    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "message-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "5").attr("result", "blur");
    glow.append("feMerge").selectAll("feMergeNode").data(["blur", "SourceGraphic"]).enter().append("feMergeNode").attr("in", d => d);

    const linkLayer = svg.append("g").attr("class", "link-layer");
    links.forEach(link => {
      const source = pointFor(link.source);
      const target = pointFor(link.target);
      const blocked = link.status === "isolated" || link.status === "partitioned";
      const path = linkLayer.append("line")
        .attr("x1", source.x).attr("y1", source.y).attr("x2", target.x).attr("y2", target.y)
        .attr("stroke", blocked ? "#d6a1b2" : link.status === "slow" ? "#c9ad72" : "#a8c8c1")
        .attr("stroke-width", blocked ? 2.1 : 1.5)
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", blocked ? "8 8" : link.status === "slow" ? "3 8" : "0")
        .attr("opacity", blocked ? 0.85 : 0.9)
        .style("cursor", "pointer")
        .on("click", () => onToggleLink(link.source, link.target));
      if (!blocked) path.append("title").text(`Click to isolate ${link.source} ↔ ${link.target}`);
      if (blocked) {
        linkLayer.append("text").attr("x", (source.x + target.x) / 2).attr("y", (source.y + target.y) / 2 - 10).attr("text-anchor", "middle").attr("class", "svg-link-status").text(link.status === "partitioned" ? "partition" : "isolated");
      }
    });

    const messageLayer = svg.append("g").attr("class", "message-layer");
    messages.slice(0, 8).forEach(message => {
      const source = pointFor(message.source);
      const target = pointFor(message.target);
      const blocked = !message.deliverable;
      const dot = messageLayer.append("circle")
        .attr("cx", source.x).attr("cy", source.y).attr("r", blocked ? 4.5 : 3.8)
        .attr("fill", blocked ? "#c3839a" : message.kind === "heartbeat" ? "#7ab7a9" : "#846da9")
        .attr("filter", "url(#message-glow)");
      if (blocked) {
        dot.attr("opacity", 0.9);
        messageLayer.append("path").attr("d", `M${target.x - 7},${target.y - 7}l14,14m0,-14l-14,14`).attr("stroke", "#c3839a").attr("stroke-width", 1.5);
      } else if (message.status === "delivered") {
        dot.attr("cx", target.x).attr("cy", target.y).attr("opacity", 0.9);
      } else {
        dot.transition().duration(720).ease(d3.easeCubicOut).attr("cx", target.x).attr("cy", target.y).attr("opacity", 0.75);
      }
    });

    const nodeLayer = svg.append("g").attr("class", "node-layer");
    nodes.forEach(node => {
      const point = pointFor(node.id);
      const color = roleColor(node.role);
      const nodeGroup = nodeLayer.append("g").attr("transform", `translate(${point.x},${point.y})`);
      if (node.role === "leader") {
        nodeGroup.append("circle").attr("r", 55).attr("fill", "#d8cdeb").attr("opacity", 0.26);
      }
      nodeGroup.append("circle").attr("r", 42).attr("fill", node.role === "offline" ? "#eee9f0" : "#fbfafc").attr("stroke", color).attr("stroke-width", node.role === "leader" ? 2.4 : 1.4).attr("stroke-dasharray", node.role === "offline" ? "4 5" : "0");
      nodeGroup.append("circle").attr("cy", -8).attr("r", 10).attr("fill", color).attr("opacity", node.role === "offline" ? 0.38 : 1);
      nodeGroup.append("text").attr("y", 17).attr("text-anchor", "middle").attr("class", "svg-node-name").text(node.label.replace("Node ", ""));
      nodeGroup.append("text").attr("y", 68).attr("text-anchor", "middle").attr("class", "svg-node-role").text(node.role.toUpperCase());
      nodeGroup.append("text").attr("y", 84).attr("text-anchor", "middle").attr("class", "svg-node-meta").text(`term ${node.term} · commit ${node.commitIndex}`);
    });
  }, [links, messages, nodes, onToggleLink]);

  return <svg ref={svgRef} className="consensus-graph" aria-label="Interactive consensus topology. Select a network link to isolate or restore it." role="img" />;
}
