import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider, KEY } from './store.jsx';
import App from './App.jsx';
import './styles.css';

// 저장 데이터가 깨져 화면이 그려지지 않을 때도 선생님이 스스로 되살릴 수 있게
class Recover extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="board" style={{ margin: 14, padding: 32, gap: 14, maxWidth: 640 }} role="alert">
        <h1 style={{ fontSize: 24 }}>화면을 그리지 못했어요</h1>
        <p>이 브라우저에 저장된 데이터가 앱과 맞지 않는 것 같아요. 다시 시도해 보고, 그래도 안 되면 저장 데이터를 지워 주세요. 지우기 전에 받아 둔 엑셀이 있으면 다시 넣으면 돼요.</p>
        <div className="row">
          <button className="btn" onClick={() => location.reload()}>다시 시도</button>
          <button className="btn danger" onClick={() => { try { localStorage.removeItem(KEY); } catch { /* 저장소 접근 불가 */ } location.hash = '#/'; location.reload(); }}>저장 데이터 지우기</button>
        </div>
      </main>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Recover>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Recover>
  </StrictMode>,
);
