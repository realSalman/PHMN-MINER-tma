import { useState, useContext, useEffect, useRef } from 'react';
import { SocketContext } from '../components/LudoApp';

const useSocketData = port => {
    const socket = useContext(SocketContext);
    const [data, setData] = useState(null);
    const lastDataRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleData = (res) => {
            let parsedData;
            try {
                parsedData = JSON.parse(res);
            } catch (error) {
                parsedData = res;
            }
            
            // Only update if data actually changed to prevent unnecessary re-renders
            if (JSON.stringify(parsedData) !== JSON.stringify(lastDataRef.current)) {
                lastDataRef.current = parsedData;
                setData(parsedData);
            }
        };

        socket.on(port, handleData);

        return () => {
            socket.off(port, handleData);
        };
    }, [socket, port]);

    return [data, setData];
};

export default useSocketData;
