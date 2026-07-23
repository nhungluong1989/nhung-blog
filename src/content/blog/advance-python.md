---
title: Advance python
description: Advance coce
pubDate: 2026-07-23
tags:
  - data engineering
---
```python
class Node:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    """
    Least Recently Used (LRU) Cache with O(1) get and put operations.
    Uses a hash map for lookups + a doubly linked list to track usage order.
    """

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # key -> Node

        # Dummy head/tail nodes simplify edge cases
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node) -> None:
        """Detach a node from the linked list."""
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_front(self, node: Node) -> None:
        """Insert a node right after head (most recently used position)."""
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_to_front(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])

        node = Node(key, value)
        self.cache[key] = node
        self._add_to_front(node)

        if len(self.cache) > self.capacity:
            # Evict the least recently used node (right before tail)
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]


# Example usage
if __name__ == "__main__":
    cache = LRUCache(capacity=2)
    cache.put(1, "a")
    cache.put(2, "b")
    print(cache.get(1))    # "a" (accessing 1 marks it as recently used)
    cache.put(3, "c")      # evicts key 2 (least recently used)
    print(cache.get(2))    # -1 (not found, was evicted)
    print(cache.get(3))    # "c"
```
